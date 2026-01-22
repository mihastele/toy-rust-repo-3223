use sqlx::{Row, TypeInfo, PgPool, MySqlPool, SqlitePool};
use crate::types::{ConnectionConfig, ColumnInfo, TableInfo, QueryRow};

fn convert_to_json_value(row: &sqlx::any::AnyRow, index: usize) -> serde_json::Value {
    let column = row.column(index);
    let type_info = column.type_info.clone();
    let type_name = type_info.name();
    
    let is_null = row.try_get::<Option<i32>, _>(index).is_err();
    if is_null {
        return serde_json::Value::Null;
    }
    
    match type_name {
        "BOOLEAN" | "BOOL" => {
            if let Ok(b) = row.try_get(index) {
                return serde_json::Value::Bool(b);
            }
        }
        "TINYINT" | "SMALLINT" | "INT" | "INTEGER" => {
            if let Ok(i) = row.try_get::<i32, _>(index) {
                return serde_json::Value::Number(i.into());
            }
        }
        "BIGINT" => {
            if let Ok(i) = row.try_get::<i64, _>(index) {
                return serde_json::Value::Number(i.into());
            }
        }
        "REAL" | "FLOAT" | "DOUBLE" | "DECIMAL" | "NUMERIC" => {
            if let Ok(f) = row.try_get::<f64, _>(index) {
                if let Some(num) = serde_json::Number::from_f64(f) {
                    return serde_json::Value::Number(num);
                }
            }
        }
        "TEXT" | "VARCHAR" | "CHAR" | "STRING" | "NAME" => {
            if let Ok(s) = row.try_get::<String, _>(index) {
                return serde_json::Value::String(s);
            }
        }
        _ => {}
    }
    
    if let Ok(s) = row.try_get::<String, _>(index) {
        return serde_json::Value::String(s);
    }
    
    serde_json::Value::String(format!("{:?}", type_info))
}

#[derive(Debug, Clone)]
pub struct DatabaseConnection {
    config: ConnectionConfig,
    pool: sqlx::AnyPool,
    db_type: String,
}

impl DatabaseConnection {
    pub async fn new(config: ConnectionConfig) -> Result<Self, Box<dyn std::error::Error>> {
        let password = config.password.clone().unwrap_or_default();
        let db_type = config.r#type.clone();
        let url = match config.r#type.as_str() {
            "sqlite" => format!("sqlite:{}", config.database),
            "postgresql" => {
                let ssl = config.ssl.unwrap_or(false);
                format!(
                    "postgresql://{}:{}@{}:{}/{}?sslmode={}",
                    config.username,
                    password,
                    config.host,
                    config.port,
                    config.database,
                    if ssl { "require" } else { "disable" }
                )
            }
            "mysql" | "mariadb" => {
                format!(
                    "mysql://{}:{}@{}:{}/{}",
                    config.username,
                    password,
                    config.host,
                    config.port,
                    config.database
                )
            }
            _ => return Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                format!("Unsupported database type: {}", config.r#type)
            ))),
        };
        
        sqlx::any::install_default_drivers();
        let pool = sqlx::AnyPool::connect(&url).await?;
        
        Ok(Self { config, pool, db_type })
    }
    
    pub async fn execute_query(&self, sql: &str) -> Result<QueryRow, Box<dyn std::error::Error>> {
        let start = std::time::Instant::now();
        
        let rows = sqlx::QueryBuilder::new(sql)
            .build()
            .fetch_all(&self.pool)
            .await?;
        
        let execution_time = start.elapsed();
        println!("Query executed in {:?}", execution_time);
        
        let mut columns = Vec::new();
        let mut types = Vec::new();
        let mut results = Vec::new();
        
        if let Some(row) = rows.first() {
            for i in 0..row.len() {
                let column = row.column(i);
                columns.push(column.name.to_string());
                types.push(format!("{:?}", column.type_info));
            }
        }
        
        for row in &rows {
            let mut values = Vec::new();
            for i in 0..row.len() {
                let json_value = convert_to_json_value(row, i);
                values.push(json_value);
            }
            results.push(values);
        }
        
        Ok(QueryRow {
            columns,
            types,
            rows: results,
        })
    }
    
    pub async fn get_schema(&self) -> Result<Vec<TableInfo>, Box<dyn std::error::Error>> {
        let query = match self.db_type.as_str() {
            "sqlite" => r#"
                SELECT name, type FROM (
                    SELECT name, 'table' as type FROM sqlite_master WHERE type='table'
                    UNION ALL
                    SELECT name, 'view' as type FROM sqlite_master WHERE type='view'
                )
                ORDER BY name
            "#,
            "postgresql" => r#"
                SELECT table_name, table_type 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            "#,
            "mysql" | "mariadb" => r#"
                SELECT table_name, table_type 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE()
                ORDER BY table_name
            "#,
            _ => return Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Schema not supported for this database type"
            ))),
        };
        
        let rows = sqlx::QueryBuilder::new(query)
            .build()
            .fetch_all(&self.pool)
            .await?;
        
        let mut tables = Vec::new();
        
        for row in &rows {
            let table_name: String = row.try_get(0)?;
            let table_type: String = row.try_get(1)?;
            
            let columns = self.get_columns(&table_name).await?;
            
            tables.push(TableInfo {
                name: table_name,
                schema: Some("public".to_string()),
                r#type: if table_type.contains("VIEW") || table_type == "view" {
                    "view".to_string()
                } else {
                    "table".to_string()
                },
                columns,
                row_count: None,
                size: None,
            });
        }
        
        Ok(tables)
    }
    
    async fn get_columns(&self, table_name: &str) -> Result<Vec<ColumnInfo>, Box<dyn std::error::Error>> {
        let query = match self.db_type.as_str() {
            "sqlite" => format!("PRAGMA table_info({})", table_name),
            "postgresql" => format!(
                "SELECT column_name, data_type, is_nullable, column_default, is_primary_key \
                 FROM information_schema.columns \
                 WHERE table_name = '{}' \
                 ORDER BY ordinal_position",
                table_name
            ),
            "mysql" | "mariadb" => format!(
                "SELECT column_name, data_type, is_nullable, column_default, extra \
                 FROM information_schema.columns \
                 WHERE table_name = '{}' AND table_schema = DATABASE() \
                 ORDER BY ordinal_position",
                table_name
            ),
            _ => return Ok(Vec::new()),
        };
        
        let rows = sqlx::QueryBuilder::new(&query)
            .build()
            .fetch_all(&self.pool)
            .await?;
        
        let mut columns = Vec::new();
        
        for row in &rows {
            let column = match self.db_type.as_str() {
                "sqlite" => {
                    let _cid: i32 = row.try_get(0)?;
                    let name: String = row.try_get(1)?;
                    let decl_type: String = row.try_get(2)?;
                    let not_null: bool = row.try_get(3)?;
                    let pk: i32 = row.try_get(5)?;
                    
                    ColumnInfo {
                        name,
                        r#type: decl_type,
                        nullable: !not_null,
                        default_value: None,
                        is_primary_key: pk > 0,
                        is_foreign_key: false,
                        foreign_key_table: None,
                        foreign_key_column: None,
                    }
                }
                _ => {
                    let name: String = row.try_get(0)?;
                    let data_type: String = row.try_get(1)?;
                    let is_nullable: String = row.try_get(2)?;
                    let column_default: Option<String> = row.try_get(3)?;
                    let extra: Option<String> = row.try_get(4)?;
                    
                    ColumnInfo {
                        name,
                        r#type: data_type,
                        nullable: is_nullable == "YES",
                        default_value: column_default,
                        is_primary_key: extra.as_ref().map(|e: &String| e.contains("PRIMARY KEY")).unwrap_or(false),
                        is_foreign_key: false,
                        foreign_key_table: None,
                        foreign_key_column: None,
                    }
                }
            };
            columns.push(column);
        }
        
        Ok(columns)
    }
    
    pub async fn execute_ddl(&self, ddl: &str) -> Result<(), Box<dyn std::error::Error>> {
        sqlx::QueryBuilder::new(ddl)
            .build()
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
