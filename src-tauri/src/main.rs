#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::Mutex;
use tauri::AppHandle;

mod database;
mod mongodb;
mod redis;
mod types;

use types::{QueryRow, TableInfo, ConnectionConfig as AppConnectionConfig};
use database::DatabaseConnection;
use mongodb::MongoConnection;
use redis::RedisConnection;

enum DbConnection {
    Sql(DatabaseConnection),
    Mongo(MongoConnection),
    Redis(RedisConnection),
}

struct AppState {
    connections: Arc<Mutex<HashMap<String, DbConnection>>>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub types: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub row_count: usize,
    pub execution_time: u64,
    pub affected_rows: usize,
    pub error: Option<String>,
}

#[tauri::command]
async fn load_connections(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<AppConnectionConfig>, String> {
    // For now, return empty vec - connections are handled in frontend with localStorage
    Ok(vec![])
}

#[tauri::command]
async fn save_connection(
    state: tauri::State<'_, AppState>,
    connection: AppConnectionConfig,
) -> Result<(), String> {
    // For now, just log the connection - actual persistence is handled in frontend
    println!("[DEBUG] Connection saved: {}", connection.name);
    Ok(())
}

#[tauri::command]
async fn delete_connection(
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    // Remove from runtime state
    let mut connections = state.connections.lock().await;
    connections.remove(&id);
    
    // Also handle in frontend
    println!("[DEBUG] Connection deleted: {}", id);
    Ok(())
}

#[tauri::command]
async fn get_connection(
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<Option<AppConnectionConfig>, String> {
    // For now, return None - connections are handled in frontend with localStorage
    Ok(None)
}

#[tauri::command]
async fn connect_database(
    _app: AppHandle,
    state: tauri::State<'_, AppState>,
    connection: AppConnectionConfig,
) -> Result<(), String> {
    let conn = match connection.r#type.as_str() {
        "sqlite" | "postgresql" | "mysql" | "mariadb" => {
            let conn = DatabaseConnection::new(connection.clone()).await
                .map_err(|e| e.to_string())?;
            DbConnection::Sql(conn)
        }
        "mongodb" => {
            let conn = MongoConnection::new(connection.clone()).await
                .map_err(|e| e.to_string())?;
            DbConnection::Mongo(conn)
        }
        "redis" => {
            let conn = RedisConnection::new(connection.clone()).await
                .map_err(|e| e.to_string())?;
            DbConnection::Redis(conn)
        }
        _ => return Err(format!("Unsupported database type: {}", connection.r#type)),
    };
    
    let mut connections = state.connections.lock().await;
    connections.insert(connection.id.clone(), conn);
    
    Ok(())
}

#[tauri::command]
async fn disconnect_database(
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    connections.remove(&id);
    Ok(())
}

#[tauri::command]
async fn execute_query(
    state: tauri::State<'_, AppState>,
    id: String,
    sql: String,
) -> Result<QueryResult, String> {
    println!("[DEBUG] execute_query called with connection_id: {}, sql: {}", id, sql);
    
    // Use separate scope for each lock to prevent deadlock
    let result = {
        let mut connections = state.connections.lock().await;
        let conn = connections.get_mut(&id).ok_or("Not connected")?;
        
        println!("[DEBUG] Found connection, executing query...");
        
        match conn {
            DbConnection::Sql(c) => c.execute_query(&sql).await
                .map_err(|e| {
                    println!("[DEBUG] SQL query error: {:?}", e);
                    e.to_string()
                })?,
            DbConnection::Mongo(c) => c.execute_mql(&sql).await
                .map_err(|e| {
                    println!("[DEBUG] MongoDB query error: {:?}", e);
                    e.to_string()
                })?,
            DbConnection::Redis(c) => c.execute_redis_cmd(&sql).await
                .map_err(|e| {
                    println!("[DEBUG] Redis command error: {:?}", e);
                    e.to_string()
                })?,
        }
    };
    
    let start = std::time::Instant::now();
    let row_count = result.rows.len();
    
    println!("[DEBUG] Query completed, returning {} rows", row_count);
    
    Ok(QueryResult {
        columns: result.columns,
        types: result.types,
        rows: result.rows,
        row_count,
        execution_time: start.elapsed().as_millis() as u64,
        affected_rows: 0,
        error: None,
    })
}

#[tauri::command]
async fn get_schema(
    state: tauri::State<'_, AppState>,
    connection_id: String,
) -> Result<Vec<TableInfo>, String> {
    let mut connections = state.connections.lock().await;
    let conn = connections.get_mut(&connection_id).ok_or("Not connected")?;
    
    match conn {
        DbConnection::Sql(c) => c.get_schema().await
            .map_err(|e| e.to_string()),
        DbConnection::Mongo(c) => c.get_collections().await
            .map_err(|e| e.to_string()),
        DbConnection::Redis(c) => c.get_info().await
            .map_err(|e| e.to_string()),
    }
}

#[tauri::command]
async fn execute_ddl(
    state: tauri::State<'_, AppState>,
    connection_id: String,
    ddl: String,
) -> Result<(), String> {
    println!("[DEBUG] execute_ddl called with connection_id: {}, ddl: {}", connection_id, ddl);
    
    let mut connections = state.connections.lock().await;
    let conn = connections.get_mut(&connection_id).ok_or("Not connected")?;
    
    println!("[DEBUG] Found connection, executing DDL...");
    
    match conn {
        DbConnection::Sql(c) => c.execute_ddl(&ddl).await
            .map_err(|e| {
                println!("[DEBUG] DDL execution error: {:?}", e);
                e.to_string()
            })?,
        DbConnection::Mongo(c) => { 
            c.execute_mql(&ddl).await
            .map_err(|e| {
                println!("[DEBUG] MongoDB DDL error: {:?}", e);
                e.to_string()
            })?; 
        }
        DbConnection::Redis(c) => { 
            c.execute_redis_cmd(&ddl).await
            .map_err(|e| {
                println!("[DEBUG] Redis DDL error: {:?}", e);
                e.to_string()
            })?; 
        }
    }
    
    println!("[DEBUG] DDL executed successfully");
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            connections: Arc::new(Mutex::new(HashMap::new())),
        })
        .invoke_handler(tauri::generate_handler![
            load_connections,
            save_connection,
            delete_connection,
            get_connection,
            connect_database,
            disconnect_database,
            execute_query,
            get_schema,
            execute_ddl,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
