import React, { useState } from 'react';
import { QueryResult } from '../types';
import { exportResult, ExportFormat, ExportOptions } from '../utils/export';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  result: QueryResult;
  tableName?: string;
}

export function ExportDialog({ isOpen, onClose, result, tableName }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [delimiter, setDelimiter] = useState(',');
  const [customTableName, setCustomTableName] = useState(tableName || 'exported_table');
  
  if (!isOpen) return null;
  
  const handleExport = () => {
    const options: ExportOptions = {
      format,
      includeHeaders,
      delimiter,
      tableName: format === 'sql' ? customTableName : undefined,
    };
    exportResult(result, options);
    onClose();
  };
  
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Export Results</h2>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.content}>
          <div style={styles.info}>
            <span style={styles.infoLabel}>Rows to export:</span>
            <span style={styles.infoValue}>{result.rowCount}</span>
            <span style={styles.infoLabel}>Columns:</span>
            <span style={styles.infoValue}>{result.columns.length}</span>
          </div>
          
          <div style={styles.section}>
            <label style={styles.label}>Export Format</label>
            <div style={styles.formatGrid}>
              {[
                { value: 'csv', label: 'CSV', icon: '📄', desc: 'Comma-separated values' },
                { value: 'json', label: 'JSON', icon: '📋', desc: 'JavaScript Object Notation' },
                { value: 'sql', label: 'SQL', icon: '🗃️', desc: 'INSERT statements' },
                { value: 'excel', label: 'Excel', icon: '📊', desc: 'Tab-separated (TSV)' },
              ].map((fmt) => (
                <button
                  key={fmt.value}
                  style={{
                    ...styles.formatButton,
                    borderColor: format === fmt.value ? 'var(--accent-primary)' : 'var(--border-color)',
                    backgroundColor: format === fmt.value ? 'var(--bg-active)' : 'transparent',
                  }}
                  onClick={() => setFormat(fmt.value as ExportFormat)}
                >
                  <span style={styles.formatIcon}>{fmt.icon}</span>
                  <span style={styles.formatLabel}>{fmt.label}</span>
                  <span style={styles.formatDesc}>{fmt.desc}</span>
                </button>
              ))}
            </div>
          </div>
          
          {(format === 'csv' || format === 'excel') && (
            <div style={styles.section}>
              <label style={styles.label}>Delimiter</label>
              <select
                style={styles.select}
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
              >
                <option value=",">Comma (,)</option>
                <option value=";">Semicolon (;)</option>
                <option value="|">Pipe (|)</option>
                <option value="\t">Tab</option>
              </select>
            </div>
          )}
          
          {format === 'sql' && (
            <div style={styles.section}>
              <label style={styles.label}>Table Name</label>
              <input
                style={styles.input}
                value={customTableName}
                onChange={(e) => setCustomTableName(e.target.value)}
                placeholder="table_name"
              />
            </div>
          )}
          
          <div style={styles.section}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={includeHeaders}
                onChange={(e) => setIncludeHeaders(e.target.checked)}
              />
              Include column headers
            </label>
          </div>
        </div>
        
        <div style={styles.footer}>
          <button style={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button style={styles.exportButton} onClick={handleExport}>
            Export {format.toUpperCase()}
          </button>
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
    width: '480px',
    maxWidth: '90vw',
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
  content: {
    padding: '20px',
  },
  info: {
    display: 'flex',
    gap: '16px',
    padding: '12px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '12px',
  },
  infoLabel: {
    color: 'var(--text-muted)',
  },
  infoValue: {
    color: 'var(--accent-primary)',
    fontWeight: 500,
    marginRight: '16px',
  },
  section: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: '8px',
  },
  formatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  formatButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid',
    transition: 'all 0.15s',
  },
  formatIcon: {
    fontSize: '20px',
    marginBottom: '4px',
  },
  formatLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  formatDesc: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '13px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '13px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid var(--border-color)',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
  },
  exportButton: {
    padding: '8px 16px',
    backgroundColor: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '4px',
    color: 'var(--bg-primary)',
    fontSize: '13px',
    fontWeight: 500,
  },
};
