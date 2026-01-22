import React, { useState, useEffect } from 'react';
import { Connection, TableInfo } from '../types';

interface SchemaBrowserProps {
  connection: Connection | undefined;
}

export function SchemaBrowser({ connection }: SchemaBrowserProps) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  
  useEffect(() => {
    if (connection && connection.status === 'connected') {
      loadSchema();
    } else {
      setTables([]);
    }
  }, [connection]);
  
  const loadSchema = async () => {
    if (!connection) return;
    setLoading(true);
    try {
      const result = await window.__TAURI__.invoke('get_schema', { 
        connectionId: connection.id 
      });
      setTables(result);
    } catch (error) {
      console.error('Failed to load schema:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleSchema = (schema: string) => {
    setExpandedSchemas((prev) => {
      const next = new Set(prev);
      if (next.has(schema)) {
        next.delete(schema);
      } else {
        next.add(schema);
      }
      return next;
    });
  };
  
  const schemas = [...new Set(tables.map(t => t.schema || 'public'))];
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Schema</span>
        <button 
          style={styles.refreshButton}
          onClick={loadSchema}
          disabled={loading}
        >
          🔄
        </button>
      </div>
      
      <div style={styles.content}>
        {!connection ? (
          <div style={styles.emptyState}>Connect to a database to view schema</div>
        ) : loading ? (
          <div style={styles.loading}>Loading schema...</div>
        ) : schemas.length === 0 ? (
          <div style={styles.emptyState}>No tables found</div>
        ) : (
          schemas.map((schema) => (
            <div key={schema} style={styles.schemaGroup}>
              <div 
                style={styles.schemaHeader}
                onClick={() => toggleSchema(schema)}
              >
                <span style={styles.expandIcon}>
                  {expandedSchemas.has(schema) ? '▼' : '▶'}
                </span>
                <span style={styles.schemaIcon}>📁</span>
                <span style={styles.schemaName}>{schema}</span>
              </div>
              
              {expandedSchemas.has(schema) && (
                <div style={styles.tables}>
                  {tables
                    .filter((t) => (t.schema || 'public') === schema)
                    .map((table) => (
                      <div key={table.name} style={styles.tableItem}>
                        <div
                          style={{
                            ...styles.tableHeader,
                            backgroundColor: selectedTable === table.name ? 'var(--bg-active)' : 'transparent',
                          }}
                          onClick={() => setSelectedTable(table.name)}
                        >
                          <span style={styles.tableIcon}>{table.type === 'view' ? '👁️' : '📊'}</span>
                          <span style={styles.tableName}>{table.name}</span>
                          <span style={styles.rowCount}>
                            {table.rowCount !== undefined ? `${table.rowCount} rows` : ''}
                          </span>
                        </div>
                        
                        {selectedTable === table.name && (
                          <div style={styles.columns}>
                            {table.columns.map((col) => (
                              <div key={col.name} style={styles.column}>
                                <span style={styles.columnIcon}>
                                  {col.isPrimaryKey ? '🔑' : 
                                   col.isForeignKey ? '🔗' : 
                                   col.nullable ? '○' : '●'}
                                </span>
                                <span style={styles.columnName}>{col.name}</span>
                                <span style={styles.columnType}>{col.type}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '200px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-secondary)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid var(--border-color)',
  },
  title: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  refreshButton: {
    background: 'transparent',
    fontSize: '12px',
    padding: '4px',
    borderRadius: '3px',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '8px 0',
  },
  emptyState: {
    padding: '16px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '12px',
  },
  loading: {
    padding: '16px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '12px',
  },
  schemaGroup: {
    marginBottom: '4px',
  },
  schemaHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  expandIcon: {
    width: '12px',
    fontSize: '8px',
    color: 'var(--text-muted)',
  },
  schemaIcon: {
    fontSize: '12px',
  },
  schemaName: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  tables: {
    marginLeft: '24px',
  },
  tableItem: {
    marginBottom: '2px',
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    cursor: 'pointer',
    borderRadius: '3px',
    transition: 'background-color 0.15s',
  },
  tableIcon: {
    fontSize: '11px',
  },
  tableName: {
    flex: 1,
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  rowCount: {
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  columns: {
    marginLeft: '24px',
    paddingRight: '12px',
  },
  column: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 0',
  },
  columnIcon: {
    fontSize: '10px',
    width: '14px',
    textAlign: 'center',
  },
  columnName: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    minWidth: '100px',
  },
  columnType: {
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
};
