use futures_util::stream::TryStreamExt;
use mongodb::{Client, Database};
use mongodb::options::ClientOptions;
use crate::types::{ConnectionConfig, ColumnInfo, TableInfo, QueryRow};

#[derive(Debug)]
pub struct MongoConnection {
    config: ConnectionConfig,
    client: Client,
    database: Database,
}

impl MongoConnection {
    pub async fn new(config: ConnectionConfig) -> Result<Self, Box<dyn std::error::Error>> {
        let password = config.password.clone().unwrap_or_default();
        
        let connection_string = if config.username.is_empty() {
            format!("mongodb://{}:{}/{}", config.host, config.port, config.database)
        } else {
            format!(
                "mongodb://{}:{}@{}:{}/{}",
                config.username, password, config.host, config.port, config.database
            )
        };
        
        let options = ClientOptions::parse(&connection_string).await?;
        let client = Client::with_options(options)?;
        let database = client.database(&config.database);
        
        Ok(Self { config, client, database })
    }
    
    pub async fn execute_mql(&self, mql: &str) -> Result<QueryRow, Box<dyn std::error::Error>> {
        let start = std::time::Instant::now();
        
        let parts: Vec<&str> = mql.splitn(2, '.').collect();
        if parts.len() < 2 {
            return Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Invalid MQL format. Use: collection.command"
            )));
        }
        
        let collection_name = parts[0];
        let command = parts[1].trim_start();
        
        let coll = self.database.collection(collection_name);
        
        let result: Result<QueryRow, Box<dyn std::error::Error>> = if command.starts_with("find(") {
            let filter_str = command.trim_start_matches("find(").trim_end_matches(')');
            let filter_doc = if filter_str.is_empty() || filter_str == "{}" {
                mongodb::bson::Document::new()
            } else {
                serde_json::from_str::<mongodb::bson::Document>(filter_str)?
            };
            
            let mut cursor = coll.find(filter_doc, None).await?;
            
            let mut columns = vec!["_id".to_string()];
            let mut types = vec!["ObjectId".to_string()];
            let mut rows = Vec::new();
            
            while let Some(doc_result) = cursor.try_next().await? {
                let doc: mongodb::bson::Document = doc_result;
                let id = doc.get_object_id("_id")
                    .map(|oid| oid.to_hex())
                    .unwrap_or_else(|_|"unknown".to_string());
                
                let data = convert_bson_to_json(&doc);
                
                if let serde_json::Value::Object(obj) = &data {
                    for (key, value) in obj {
                        if key == "_id" { continue; }
                        if !columns.contains(key) {
                            columns.push(key.clone());
                            types.push(mongo_type_to_string(value));
                        }
                    }
                }
                
                let row_values: Vec<serde_json::Value> = columns.iter().map(|col| {
                    if col == "_id" { return serde_json::Value::String(id.clone()); }
                    if let serde_json::Value::Object(obj) = &data {
                        obj.get(col).cloned().unwrap_or(serde_json::Value::Null)
                    } else {
                        serde_json::Value::Null
                    }
                }).collect();
                rows.push(row_values);
            }
            
            Ok(QueryRow {
                columns,
                types,
                rows,
            })
        } else if command.starts_with("count()") {
            let count = coll.count_documents(mongodb::bson::Document::new(), None).await?;
            
            Ok(QueryRow {
                columns: vec!["count".to_string()],
                types: vec!["Int64".to_string()],
                rows: vec![vec![serde_json::Value::Number(count.into())]],
            })
        } else {
            return Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                format!("Unsupported MQL command: {}", command)
            )));
        };
        
        let execution_time = start.elapsed();
        println!("MQL executed in {:?}", execution_time);
        
        result
    }
    
    pub async fn get_collections(&self) -> Result<Vec<TableInfo>, Box<dyn std::error::Error>> {
        let cursor = self.database.list_collection_names(None).await?;
        
        let mut collections = Vec::new();
        for name in cursor {
            collections.push(TableInfo {
                name,
                schema: Some(self.config.database.clone()),
                r#type: "collection".to_string(),
                columns: vec![
                    ColumnInfo {
                        name: "_id".to_string(),
                        r#type: "ObjectId".to_string(),
                        nullable: false,
                        default_value: None,
                        is_primary_key: true,
                        is_foreign_key: false,
                        foreign_key_table: None,
                        foreign_key_column: None,
                    },
                ],
                row_count: None,
                size: None,
            });
        }
        
        Ok(collections)
    }
}

fn convert_bson_to_json(doc: &mongodb::bson::Document) -> serde_json::Value {
    let mut obj = serde_json::Map::new();
    for (key, value) in doc {
        obj.insert(key.clone(), convert_bson_value(value));
    }
    serde_json::Value::Object(obj)
}

fn convert_bson_value(value: &mongodb::bson::Bson) -> serde_json::Value {
    match value {
        mongodb::bson::Bson::Null => serde_json::Value::Null,
        mongodb::bson::Bson::Boolean(b) => serde_json::Value::Bool(*b),
        mongodb::bson::Bson::Int32(i) => serde_json::Value::Number((*i).into()),
        mongodb::bson::Bson::Int64(i) => serde_json::Value::Number((*i).into()),
        mongodb::bson::Bson::Double(d) => serde_json::Number::from_f64(*d)
            .map(serde_json::Value::Number)
            .unwrap_or(serde_json::Value::Null),
        mongodb::bson::Bson::String(s) => serde_json::Value::String(s.clone()),
        mongodb::bson::Bson::Array(arr) => serde_json::Value::Array(arr.iter().map(convert_bson_value).collect()),
        mongodb::bson::Bson::Document(doc) => convert_bson_to_json(doc),
        mongodb::bson::Bson::ObjectId(oid) => serde_json::Value::String(oid.to_hex()),
        _ => serde_json::Value::String(format!("{:?}", value)),
    }
}

fn mongo_type_to_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Null => "Null".to_string(),
        serde_json::Value::Bool(_) => "Boolean".to_string(),
        serde_json::Value::Number(n) => {
            if n.is_i64() { "Int64".to_string() }
            else if n.is_f64() { "Double".to_string() }
            else { "Number".to_string() }
        }
        serde_json::Value::String(_) => "String".to_string(),
        serde_json::Value::Array(_) => "Array".to_string(),
        serde_json::Value::Object(_) => "Document".to_string(),
    }
}
