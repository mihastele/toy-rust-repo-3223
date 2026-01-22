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
    let mut connections = state.connections.lock().await;
    let conn = connections.get_mut(&id).ok_or("Not connected")?;
    
    let result = match conn {
        DbConnection::Sql(c) => c.execute_query(&sql).await
            .map_err(|e| e.to_string())?,
        DbConnection::Mongo(c) => c.execute_mql(&sql).await
            .map_err(|e| e.to_string())?,
        DbConnection::Redis(c) => c.execute_redis_cmd(&sql).await
            .map_err(|e| e.to_string())?,
    };
    
    let start = std::time::Instant::now();
    let row_count = result.rows.len();
    
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
    let mut connections = state.connections.lock().await;
    let conn = connections.get_mut(&connection_id).ok_or("Not connected")?;
    
    match conn {
        DbConnection::Sql(c) => c.execute_ddl(&ddl).await
            .map_err(|e| e.to_string())?,
        DbConnection::Mongo(c) => { c.execute_mql(&ddl).await.map_err(|e| e.to_string())?; }
        DbConnection::Redis(c) => { c.execute_redis_cmd(&ddl).await.map_err(|e| e.to_string())?; }
    }
    
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            connections: Arc::new(Mutex::new(HashMap::new())),
        })
        .invoke_handler(tauri::generate_handler![
            connect_database,
            disconnect_database,
            execute_query,
            get_schema,
            execute_ddl,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
