import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TableInfo, ColumnInfo, Connection } from '../types';
import { formatSql } from '../utils/sqlFormatter';

interface TableStructureEditorProps {
  isOpen: boolean;
  onClose: () => void;
  connection: Connection | undefined;
  tableName: string;
  schema?: string;
  onStructureChanged: () => void;
}

type ColumnDefinition = {
  id: string;
  name: string;
  type: string;
  length?: number;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isAutoIncrement: boolean;
  comment?: string;
};

const DATA_TYPES: { value: string; label: string }[] = [
  { value: 'INTEGER', label: 'INTEGER' },
  { value: 'INT', label: 'INT' },
  { value: 'BIGINT', label: 'BIGINT' },
  { value: 'SMALLINT', label: 'SMALLINT' },
  { value: 'TINYINT', label: 'TINYINT' },
  { value: 'SERIAL', label: 'SERIAL' },
  { value: 'BIGSERIAL', label: 'BIGSERIAL' },
  { value: 'VARCHAR', label: 'VARCHAR' },
  { value: 'CHAR', label: 'CHAR' },
  { value: 'TEXT', label: 'TEXT' },
  { value: 'LONGTEXT', label: 'LONGTEXT' },
  { value: 'JSON', label: 'JSON' },
  { value: 'JSONB', label: 'JSONB' },
  { value: 'BOOLEAN', label: 'BOOLEAN' },
  { value: 'DATE', label: 'DATE' },
  { value: 'TIME', label: 'TIME' },
  { value: 'TIMESTAMP', label: 'TIMESTAMP' },
  { value: 'DATETIME', label: 'DATETIME' },
  { value: 'FLOAT', label: 'FLOAT' },
  { value: 'DOUBLE', label: 'DOUBLE' },
  { value: 'DECIMAL', label: 'DECIMAL' },
  { value: 'NUMERIC', label: 'NUMERIC' },
  { value: 'BLOB', label: 'BLOB' },
  { value: 'BINARY', label: 'BINARY' },
  { value: 'ENUM', label: 'ENUM' },
  { value: 'SET', label: 'SET' },
  { value: 'POINT', label: 'POINT' },
  { value: 'LINE', label: 'LINE' },
  { value: 'POLYGON', label: 'POLYGON' },
  { value: 'UUID', label: 'UUID' },
  { value: 'INET', label: 'INET' },
  { value: 'CIDR', label: 'CIDR' },
  { value: 'MACADDR', label: 'MACADDR' },
  { value: 'XML', label: 'XML' },
];

export function TableStructureEditor({ 
  isOpen, 
  onClose, 
  connection, 
  tableName, 
  schema = 'public',
  onStructureChanged 
}: TableStructureEditorProps) {
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'columns' | 'indexes' | 'foreign_keys' | 'ddl'>('columns');
  const [newColumn, setNewColumn] = useState<ColumnDefinition>({
    id: '',
    name: '',
    type: 'VARCHAR',
    nullable: true,
    isPrimaryKey: false,
    isUnique: false,
    isAutoIncrement: false,
  });
  const [generatedDDL, setGeneratedDDL] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && connection && connection.status === 'connected') {
      loadTableStructure();
    }
  }, [isOpen, connection, tableName]);

  useEffect(() => {
    generateDDL();
  }, [columns, tableName, schema]);

  if (!isOpen) return null;

  const loadTableStructure = async () => {
    if (!connection) return;
    setLoading(true);
    setError(null);
    
    try {
      const result = await invoke<TableInfo[]>('get_schema', { 
        connectionId: connection.id 
      });
      
      const table = result.find((t: TableInfo) => t.name === tableName && (t.schema || 'public') === schema);
      
      if (table) {
        const columnDefs: ColumnDefinition[] = table.columns.map((col: ColumnInfo) => ({
          id: col.name,
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          defaultValue: col.defaultValue,
          isPrimaryKey: col.isPrimaryKey,
          isUnique: false,
          isAutoIncrement: false,
        }));
        setColumns(columnDefs);
      } else {
        setColumns([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load table structure');
    } finally {
      setLoading(false);
    }
  };

  const generateDDL = () => {
    if (!tableName) return;
    
    const fullName = schema ? `${schema}.${tableName}` : tableName;
    
    const columnDefs = columns.map(col => {
      let def = `  "${col.name}" ${col.type.toUpperCase()}`;
      
      if (col.type.toUpperCase() === 'VARCHAR' && col.length) {
        def += `(${col.length})`;
      }
      
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue !== undefined && col.defaultValue !== '') {
        def += ` DEFAULT ${col.defaultValue}`;
      }
      
      return def;
    }).join(',\n');
    
    const pkColumns = columns.filter(c => c.isPrimaryKey);
    let ddl = `CREATE TABLE "${fullName}" (\n${columnDefs}`;
    
    if (pkColumns.length > 0) {
      ddl += `,\n  PRIMARY KEY (${pkColumns.map(c => `"${c.name}"`).join(', ')})`;
    }
    
    ddl += '\n);';
    
    setGeneratedDDL(ddl);
  };

  const addColumn = () => {
    if (!newColumn.name.trim()) {
      setError('Column name is required');
      return;
    }
    
    const column: ColumnDefinition = {
      ...newColumn,
      id: crypto.randomUUID(),
    };
    
    setColumns([...columns, column]);
    setNewColumn({
      id: '',
      name: '',
      type: 'VARCHAR',
      nullable: true,
      isPrimaryKey: false,
      isUnique: false,
      isAutoIncrement: false,
    });
    setError(null);
  };

  const removeColumn = (columnId: string) => {
    setColumns(columns.filter(c => c.id !== columnId));
  };

  const updateColumn = (columnId: string, updates: Partial<ColumnDefinition>) => {
    setColumns(columns.map(c => 
      c.id === columnId ? { ...c, ...updates } : c
    ));
  };

  const executeDDL = async () => {
    if (!connection) return;
    setLoading(true);
    setError(null);
    
    try {
      await invoke('execute_ddl', {
        connectionId: connection.id,
        ddl: generatedDDL,
      });
      onStructureChanged();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to execute DDL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>🗃️ Table Structure: {tableName}</h2>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.tabs}>
          {[
            { key: 'columns', label: '📋 Columns' },
            { key: 'indexes', label: '📊 Indexes' },
            { key: 'foreign_keys', label: '🔗 Foreign Keys' },
            { key: 'ddl', label: '📝 DDL' },
          ].map(tab => (
            <button
              key={tab.key}
              style={{
                ...styles.tab,
                backgroundColor: activeTab === tab.key ? 'var(--bg-active)' : 'transparent',
                borderBottomColor: activeTab === tab.key ? 'var(--accent-primary)' : 'transparent',
              }}
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}>Loading table structure...</div>
          ) : error ? (
            <div style={styles.error}>{error}</div>
          ) : activeTab === 'columns' ? (
            <div style={styles.columnsTab}>
              <div style={styles.columnList}>
                {columns.map((column) => (
                  <div key={column.id} style={styles.columnRow}>
                    <div style={styles.columnDrag}>⋮⋮</div>
                    <input
                      style={styles.columnName}
                      value={column.name}
                      onChange={(e) => updateColumn(column.id, { name: e.target.value })}
                      placeholder="Column name"
                    />
                    <select
                      style={styles.columnType}
                      value={column.type}
                      onChange={(e) => updateColumn(column.id, { type: e.target.value })}
                    >
                      {DATA_TYPES.map(dt => (
                        <option key={dt.value} value={dt.value}>{dt.label}</option>
                      ))}
                    </select>
                    {column.type.toUpperCase().includes('CHAR') && (
                      <input
                        style={styles.columnLength}
                        type="number"
                        value={column.length || ''}
                        onChange={(e) => updateColumn(column.id, { length: parseInt(e.target.value) || undefined })}
                        placeholder="Length"
                      />
                    )}
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={column.nullable}
                        onChange={(e) => updateColumn(column.id, { nullable: e.target.checked })}
                      />
                      Nullable
                    </label>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={column.isPrimaryKey}
                        onChange={(e) => updateColumn(column.id, { isPrimaryKey: e.target.checked })}
                      />
                      PK
                    </label>
                    <button
                      style={styles.removeButton}
                      onClick={() => removeColumn(column.id)}
                      title="Remove column"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
              
              <div style={styles.addColumn}>
                <h4 style={styles.sectionTitle}>Add New Column</h4>
                <div style={styles.addColumnRow}>
                  <input
                    style={styles.newColumnName}
                    value={newColumn.name}
                    onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                    placeholder="New column name"
                  />
                  <select
                    style={styles.newColumnType}
                    value={newColumn.type}
                    onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value })}
                  >
                    {DATA_TYPES.map(dt => (
                      <option key={dt.value} value={dt.value}>{dt.label}</option>
                    ))}
                  </select>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={newColumn.nullable}
                      onChange={(e) => setNewColumn({ ...newColumn, nullable: e.target.checked })}
                    />
                    Nullable
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={newColumn.isPrimaryKey}
                      onChange={(e) => setNewColumn({ ...newColumn, isPrimaryKey: e.target.checked })}
                    />
                    PK
                  </label>
                  <button style={styles.addButton} onClick={addColumn}>➕ Add</button>
                </div>
              </div>
            </div>
          ) : activeTab === 'ddl' ? (
            <div style={styles.ddlTab}>
              <div style={styles.ddlHeader}>
                <span>Generated DDL Statement</span>
                <div style={styles.ddlActions}>
                  <button 
                    style={styles.copyButton}
                    onClick={() => navigator.clipboard.writeText(generatedDDL)}
                  >
                    📋 Copy
                  </button>
                  <button 
                    style={styles.formatButton}
                    onClick={() => setGeneratedDDL(formatSql(generatedDDL))}
                  >
                    ✨ Format
                  </button>
                </div>
              </div>
              <textarea
                style={styles.ddlEditor}
                value={generatedDDL}
                onChange={(e) => setGeneratedDDL(e.target.value)}
                placeholder="DDL will be generated from table structure..."
              />
            </div>
          ) : (
            <div style={styles.placeholderTab}>
              <span style={styles.placeholderIcon}>🚧</span>
              <span>{activeTab === 'indexes' ? 'Index management coming soon' : 'Foreign key management coming soon'}</span>
            </div>
          )}
        </div>
        
        <div style={styles.footer}>
          <span style={styles.footerInfo}>
            {columns.length} columns
          </span>
          <div style={styles.footerActions}>
            <button style={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button 
              style={styles.applyButton}
              onClick={executeDDL}
              disabled={loading}
            >
              {loading ? '⏳ Applying...' : '⚡ Apply Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    width: '900px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-color)',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  closeButton: {
    background: 'transparent',
    fontSize: '20px',
    color: 'var(--text-muted)',
    padding: '4px 8px',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--border-color)',
    padding: '0 16px',
  },
  tab: {
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-muted)',
  },
  error: {
    padding: '16px',
    backgroundColor: 'rgba(243, 139, 168, 0.1)',
    border: '1px solid var(--accent-error)',
    borderRadius: '6px',
    color: 'var(--accent-error)',
    fontSize: '12px',
  },
  columnsTab: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  columnList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  columnRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '6px',
  },
  columnDrag: {
    cursor: 'grab',
    color: 'var(--text-muted)',
    fontSize: '12px',
  },
  columnName: {
    width: '150px',
    padding: '6px 10px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '12px',
  },
  columnType: {
    width: '120px',
    padding: '6px 10px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '12px',
  },
  columnLength: {
    width: '70px',
    padding: '6px 10px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '12px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  removeButton: {
    background: 'transparent',
    fontSize: '12px',
    padding: '4px 8px',
    marginLeft: 'auto',
    opacity: 0.7,
  },
  addColumn: {
    padding: '16px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '6px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '12px',
  },
  addColumnRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  newColumnName: {
    width: '150px',
    padding: '6px 10px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '12px',
  },
  newColumnType: {
    width: '120px',
    padding: '6px 10px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '12px',
  },
  addButton: {
    padding: '6px 12px',
    backgroundColor: 'var(--accent-success)',
    color: 'var(--bg-primary)',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    marginLeft: 'auto',
  },
  ddlTab: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  ddlHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  ddlActions: {
    display: 'flex',
    gap: '8px',
  },
  copyButton: {
    padding: '4px 8px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '11px',
  },
  formatButton: {
    padding: '4px 8px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '11px',
  },
  ddlEditor: {
    flex: 1,
    minHeight: '200px',
    padding: '12px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-family)',
    fontSize: '12px',
    lineHeight: '1.6',
    resize: 'vertical',
  },
  placeholderTab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: 'var(--text-muted)',
    fontSize: '13px',
  },
  placeholderIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderTop: '1px solid var(--border-color)',
  },
  footerInfo: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  footerActions: {
    display: 'flex',
    gap: '12px',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-secondary)',
    fontSize: '12px',
  },
  applyButton: {
    padding: '8px 16px',
    backgroundColor: 'var(--accent-primary)',
    color: 'var(--bg-primary)',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
};
