import React, { useState, useCallback } from 'react';
import { QueryResult, ColumnInfo } from '../types';

interface EditableTableCellProps {
  value: any;
  column: ColumnInfo;
  onSave: (newValue: any) => Promise<void>;
  onCancel: () => void;
}

function EditableTableCell({ value, column, onSave, onCancel }: EditableTableCellProps) {
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editValue);
    } finally {
      setSaving(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };
  
  const renderInput = () => {
    const sqlType = column.type.toLowerCase();
    
    if (sqlType.includes('int') || sqlType.includes('serial') || sqlType.includes('bigint')) {
      return (
        <input
          style={styles.input}
          type="number"
          value={editValue ?? ''}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={saving}
        />
      );
    }
    
    if (sqlType.includes('float') || sqlType.includes('double') || sqlType.includes('decimal')) {
      return (
        <input
          style={styles.input}
          type="number"
          step="any"
          value={editValue ?? ''}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={saving}
        />
      );
    }
    
    if (sqlType.includes('bool')) {
      return (
        <select
          style={styles.input}
          value={editValue === true ? 'true' : editValue === false ? 'false' : ''}
          onChange={(e) => setEditValue(e.target.value === 'true')}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={saving}
        >
          <option value="">NULL</option>
          <option value="true">TRUE</option>
          <option value="false">FALSE</option>
        </select>
      );
    }
    
    return (
      <textarea
        style={{...styles.input, minHeight: '60px', resize: 'vertical'}}
        value={editValue ?? ''}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        disabled={saving}
      />
    );
  };
  
  return (
    <div style={styles.cellEditor}>
      {renderInput()}
      <div style={styles.editorActions}>
        <button
          style={styles.saveButton}
          onClick={handleSave}
          disabled={saving}
          title="Save"
        >
          ✓
        </button>
        <button
          style={styles.cancelButton}
          onClick={onCancel}
          disabled={saving}
          title="Cancel"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

interface EditableResultsTableProps {
  result: QueryResult;
  columns: ColumnInfo[];
  onUpdate: (rowIndex: number, columnName: string, value: any) => Promise<void>;
  onDelete?: (rowIndex: number) => Promise<void>;
  onInsert?: () => void;
}

export function EditableResultsTable({
  result,
  columns,
  onUpdate,
  onDelete,
  onInsert,
}: EditableResultsTableProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [savingRows, setSavingRows] = useState<Set<number>>(new Set());
  
  const handleSave = useCallback(async (rowIndex: number, columnName: string, value: any) => {
    setSavingRows((prev) => new Set(prev).add(rowIndex));
    try {
      await onUpdate(rowIndex, columnName, value);
    } finally {
      setSavingRows((prev) => {
        const next = new Set(prev);
        next.delete(rowIndex);
        return next;
      });
      setEditingCell(null);
    }
  }, [onUpdate]);
  
  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <button style={styles.insertButton} onClick={onInsert}>
          ➕ Insert Row
        </button>
        <span style={styles.hint}>
          Click a cell to edit • Press Enter to save
        </span>
      </div>
      
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thIndex}>#</th>
              {columns.map((col, idx) => (
                <th key={idx} style={styles.th}>
                  <div style={styles.columnHeader}>
                    <span>{col.name}</span>
                    <span style={styles.columnType}>{col.type}</span>
                  </div>
                  {col.isPrimaryKey && <span style={styles.pkIcon} title="Primary Key">🔑</span>}
                </th>
              ))}
              {onDelete && <th style={styles.thAction}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                style={{
                  ...styles.tr,
                  opacity: savingRows.has(rowIndex) ? 0.5 : 1,
                }}
              >
                <td style={styles.tdIndex}>{rowIndex + 1}</td>
                {result.columns.map((colName, colIndex) => {
                  const isEditing = editingCell?.row === rowIndex && editingCell?.col === colName;
                  const column = columns.find((c) => c.name === colName);
                  const cellValue = row[colIndex];
                  
                  if (isEditing && column) {
                    return (
                      <td key={colIndex} style={styles.td}>
                        <EditableTableCell
                          value={cellValue}
                          column={column}
                          onSave={(newValue) => handleSave(rowIndex, colName, newValue)}
                          onCancel={() => setEditingCell(null)}
                        />
                      </td>
                    );
                  }
                  
                  return (
                    <td
                      key={colIndex}
                      style={styles.td}
                      onClick={() => !column?.isPrimaryKey && setEditingCell({ row: rowIndex, col: colName })}
                      title={column && !column.isPrimaryKey ? 'Click to edit' : 'Primary key - not editable'}
                    >
                      <div style={styles.cellContent}>
                        <span style={{
                          ...styles.cellValue,
                          color: cellValue === null ? 'var(--text-muted)' : 'var(--text-primary)',
                          fontStyle: cellValue === null ? 'italic' : 'normal',
                        }}>
                          {formatCellValue(cellValue)}
                        </span>
                        {column && !column.isPrimaryKey && (
                          <span style={styles.editIcon}>✏️</span>
                        )}
                      </div>
                    </td>
                  );
                })}
                {onDelete && (
                  <td style={styles.tdAction}>
                    <button
                      style={styles.deleteButton}
                      onClick={() => onDelete!(rowIndex)}
                      title="Delete row"
                    >
                      🗑️
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCellValue(value: any): string {
  if (value === null) return 'NULL';
  if (value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
  },
  insertButton: {
    backgroundColor: 'var(--accent-success)',
    color: 'var(--bg-primary)',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  hint: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  tableWrapper: {
    flex: 1,
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  th: {
    padding: '8px 12px',
    textAlign: 'left',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    borderBottom: '1px solid var(--border-color)',
    whiteSpace: 'nowrap',
    position: 'relative',
  },
  thIndex: {
    padding: '8px 12px',
    textAlign: 'left',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-muted)',
    fontWeight: 500,
    borderBottom: '1px solid var(--border-color)',
    width: '50px',
  },
  columnHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  columnType: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontWeight: 400,
  },
  pkIcon: {
    position: 'absolute',
    right: '4px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '10px',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
    transition: 'background-color 0.15s',
  },
  td: {
    padding: '4px 8px',
    color: 'var(--text-primary)',
    maxWidth: '250px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  tdIndex: {
    padding: '8px 12px',
    color: 'var(--text-muted)',
    width: '50px',
  },
  cellContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 0',
  },
  cellValue: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  editIcon: {
    fontSize: '10px',
    opacity: 0,
    transition: 'opacity 0.15s',
  },
  cellEditor: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
  },
  input: {
    flex: 1,
    padding: '4px 8px',
    backgroundColor: 'var(--bg-active)',
    border: '1px solid var(--accent-primary)',
    borderRadius: '3px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
    fontFamily: 'var(--font-family)',
  },
  editorActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  saveButton: {
    backgroundColor: 'var(--accent-success)',
    color: 'var(--bg-primary)',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '2px',
  },
  cancelButton: {
    backgroundColor: 'var(--accent-error)',
    color: 'var(--bg-primary)',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '2px',
  },
  thAction: {
    width: '50px',
    padding: '8px',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
  },
  tdAction: {
    width: '50px',
    padding: '4px 8px',
    textAlign: 'center',
  },
  deleteButton: {
    background: 'transparent',
    fontSize: '12px',
    padding: '4px',
    borderRadius: '3px',
    opacity: 0.7,
  },
};
