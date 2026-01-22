export type DatabaseType = 
  | 'sqlite' 
  | 'postgresql' 
  | 'mysql' 
  | 'mariadb' 
  | 'oracle' 
  | 'sqlserver' 
  | 'mongodb' 
  | 'redis' 
  | 'snowflake' 
  | 'bigquery'
  | 'cassandra'
  | 'elasticsearch';

export interface ConnectionConfig {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  ssl?: boolean;
  ssh?: {
    host: string;
    port: number;
    username: string;
    privateKey?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Connection extends ConnectionConfig {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  error?: string;
}

export interface TableInfo {
  name: string;
  schema?: string;
  type: 'table' | 'view' | 'materialized_view';
  columns: ColumnInfo[];
  rowCount?: number;
  size?: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyTable?: string;
  foreignKeyColumn?: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  type: string;
}

export interface QueryResult {
  columns: string[];
  types: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
  affectedRows: number;
  error?: string;
}

export interface Query {
  id: string;
  name?: string;
  connectionId: string;
  sql: string;
  results?: QueryResult;
  status: 'idle' | 'running' | 'completed' | 'error';
  executedAt?: Date;
  favorite: boolean;
}

export interface QueryHistory {
  id: string;
  connectionId: string;
  sql: string;
  executedAt: Date;
  executionTime: number;
  success: boolean;
  error?: string;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'sql' | 'excel';
  includeHeaders: boolean;
  delimiter: string;
  encoding: string;
}

export interface DriverCapabilities {
  supportsSSL: boolean;
  supportsSSH: boolean;
  supportsBackup: boolean;
  supportsRestore: boolean;
  supportsExplain: boolean;
  supportsTransactions: boolean;
  maxConnections: number;
}
