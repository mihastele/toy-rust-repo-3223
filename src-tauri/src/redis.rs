use redis::Client;
use crate::types::{ConnectionConfig, ColumnInfo, TableInfo, QueryRow};

#[derive(Debug)]
pub struct RedisConnection {
    config: ConnectionConfig,
    client: Client,
}

impl RedisConnection {
    pub async fn new(config: ConnectionConfig) -> Result<Self, Box<dyn std::error::Error>> {
        let password = config.password.clone().unwrap_or_default();
        
        let url = format!(
            "redis://{}:{}@{}:{}/{}",
            if config.username.is_empty() { "" } else { &config.username },
            if password.is_empty() { "" } else { &password },
            config.host,
            config.port,
            config.database
        );
        
        let client = redis::Client::open(url)?;
        let mut con = client.get_connection()?;
        let _: String = redis::Cmd::new().arg("PING").query(&mut con)?;
        
        Ok(Self { config, client })
    }
    
    pub async fn list_keys(&self, pattern: &str) -> Result<Vec<(String, String, usize, Option<i64>)>, Box<dyn std::error::Error>> {
        let mut con = self.client.get_connection()?;
        
        let keys: Vec<String> = redis::Cmd::new()
            .arg("KEYS")
            .arg(pattern)
            .query(&mut con)?;
        
        let mut key_infos = Vec::new();
        
        for key in keys {
            let key_type: String = redis::Cmd::new()
                .arg("TYPE")
                .arg(&key)
                .query(&mut con)?;
            
            let size = match key_type.as_str() {
                "string" => {
                    let len: usize = redis::Cmd::new()
                        .arg("STRLEN")
                        .arg(&key)
                        .query(&mut con)?;
                    len
                }
                "list" => {
                    let len: usize = redis::Cmd::new()
                        .arg("LLEN")
                        .arg(&key)
                        .query(&mut con)?;
                    len
                }
                "set" => {
                    let len: usize = redis::Cmd::new()
                        .arg("SCARD")
                        .arg(&key)
                        .query(&mut con)?;
                    len
                }
                "zset" => {
                    let len: usize = redis::Cmd::new()
                        .arg("ZCARD")
                        .arg(&key)
                        .query(&mut con)?;
                    len
                }
                "hash" => {
                    let len: usize = redis::Cmd::new()
                        .arg("HLEN")
                        .arg(&key)
                        .query(&mut con)?;
                    len
                }
                _ => 0,
            };
            
            let ttl: i64 = redis::Cmd::new()
                .arg("TTL")
                .arg(&key)
                .query(&mut con)?;
            
            key_infos.push((key, key_type, size, if ttl == -1 { None } else { Some(ttl) }));
        }
        
        Ok(key_infos)
    }
    
    pub async fn get_value(&self, key: &str) -> Result<QueryRow, Box<dyn std::error::Error>> {
        let mut con = self.client.get_connection()?;
        
        let key_type: String = redis::Cmd::new()
            .arg("TYPE")
            .arg(key)
            .query(&mut con)?;
        
        match key_type.as_str() {
            "string" => {
                let value: String = redis::Cmd::new()
                    .arg("GET")
                    .arg(key)
                    .query(&mut con)?;
                
                Ok(QueryRow {
                    columns: vec!["key".to_string(), "value".to_string()],
                    types: vec!["String".to_string(), "String".to_string()],
                    rows: vec![vec![
                        serde_json::Value::String(key.to_string()),
                        serde_json::Value::String(value),
                    ]],
                })
            }
            "list" => {
                let values: Vec<String> = redis::Cmd::new()
                    .arg("LRANGE")
                    .arg(key)
                    .arg(0)
                    .arg(-1)
                    .query(&mut con)?;
                
                let rows: Vec<Vec<serde_json::Value>> = values.into_iter()
                    .enumerate()
                    .map(|(i, v)| vec![
                        serde_json::Value::Number((i + 1).into()),
                        serde_json::Value::String(v),
                    ])
                    .collect();
                
                Ok(QueryRow {
                    columns: vec!["index".to_string(), "value".to_string()],
                    types: vec!["Int".to_string(), "String".to_string()],
                    rows,
                })
            }
            "hash" => {
                let entries: Vec<(String, String)> = redis::Cmd::new()
                    .arg("HGETALL")
                    .arg(key)
                    .query(&mut con)?;
                
                let rows: Vec<Vec<serde_json::Value>> = entries.into_iter()
                    .map(|(field, value)| vec![
                        serde_json::Value::String(field),
                        serde_json::Value::String(value),
                    ])
                    .collect();
                
                Ok(QueryRow {
                    columns: vec!["field".to_string(), "value".to_string()],
                    types: vec!["String".to_string(), "String".to_string()],
                    rows,
                })
            }
            "set" => {
                let members: Vec<String> = redis::Cmd::new()
                    .arg("SMEMBERS")
                    .arg(key)
                    .query(&mut con)?;
                
                let rows: Vec<Vec<serde_json::Value>> = members.into_iter()
                    .map(|m| vec![serde_json::Value::String(m)])
                    .collect();
                
                Ok(QueryRow {
                    columns: vec!["member".to_string()],
                    types: vec!["String".to_string()],
                    rows,
                })
            }
            "zset" => {
                let members: Vec<(String, f64)> = redis::Cmd::new()
                    .arg("ZRANGE")
                    .arg(key)
                    .arg(0)
                    .arg(-1)
                    .arg("WITHSCORES")
                    .query(&mut con)?;
                
                let rows: Vec<Vec<serde_json::Value>> = members.into_iter()
                    .map(|(member, score)| vec![
                        serde_json::Value::String(member),
                        serde_json::Value::Number(serde_json::Number::from_f64(score).unwrap()),
                    ])
                    .collect();
                
                Ok(QueryRow {
                    columns: vec!["member".to_string(), "score".to_string()],
                    types: vec!["String".to_string(), "Double".to_string()],
                    rows,
                })
            }
            _ => Ok(QueryRow {
                columns: vec!["error".to_string()],
                types: vec!["String".to_string()],
                rows: vec![vec![serde_json::Value::String(format!("Unsupported type: {}", key_type))]],
            }),
        }
    }
    
    pub async fn execute_redis_cmd(&self, cmd: &str) -> Result<QueryRow, Box<dyn std::error::Error>> {
        let mut con = self.client.get_connection()?;
        
        let parts: Vec<&str> = cmd.split_whitespace().collect();
        if parts.is_empty() {
            return Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Empty command"
            )));
        }
        
        let mut redis_cmd = redis::Cmd::new();
        redis_cmd.arg(parts[0]);
        
        for arg in &parts[1..] {
            redis_cmd.arg(arg);
        }
        
        let start = std::time::Instant::now();
        
        let result = redis_cmd.query::<String>(&mut con);
        let execution_time = start.elapsed();
        println!("Redis command executed in {:?}", execution_time);
        
        match result {
            Ok(_) => Ok(QueryRow {
                columns: vec!["OK".to_string()],
                types: vec!["String".to_string()],
                rows: vec![vec![serde_json::Value::String("OK".to_string())]],
            }),
            Err(e) => Err(Box::new(e)),
        }
    }
    
    pub async fn get_info(&self) -> Result<Vec<TableInfo>, Box<dyn std::error::Error>> {
        let keys = self.list_keys("*").await?;
        
        Ok(vec![TableInfo {
            name: "keys".to_string(),
            schema: Some(self.config.database.clone()),
            r#type: "redis_keys".to_string(),
            columns: vec![
                ColumnInfo {
                    name: "name".to_string(),
                    r#type: "String".to_string(),
                    nullable: false,
                    default_value: None,
                    is_primary_key: true,
                    is_foreign_key: false,
                    foreign_key_table: None,
                    foreign_key_column: None,
                },
                ColumnInfo {
                    name: "type".to_string(),
                    r#type: "String".to_string(),
                    nullable: false,
                    default_value: None,
                    is_primary_key: false,
                    is_foreign_key: false,
                    foreign_key_table: None,
                    foreign_key_column: None,
                },
                ColumnInfo {
                    name: "size".to_string(),
                    r#type: "Int".to_string(),
                    nullable: false,
                    default_value: None,
                    is_primary_key: false,
                    is_foreign_key: false,
                    foreign_key_table: None,
                    foreign_key_column: None,
                },
            ],
            row_count: Some(keys.len() as u64),
            size: None,
        }])
    }
}
