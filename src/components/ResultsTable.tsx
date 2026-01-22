import React, { useState } from 'react';
import { Query } from '../types';
import { ExportDialog } from './ExportDialog';

interface ResultsTableProps {
  query: Query | undefined;
}

export function ResultsTable({ query }: ResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const pageSize = 100;
  
  if (!query || !query.results) {
    return (
      <div style={styles.emptyState}>
        <span style={styles.emptyIcon}>📊</span>
        <span style={styles.emptyText}>No results to display</span>
        <span style={styles.emptyHint}>Execute a query to see results here</span>
      </div>
    );
  }
  
  if (query.results.error) {
    return (
      <div style={styles.errorState}>
        <span style={styles.errorIcon}>⚠️</span>
        <span style={styles.errorTitle}>Query Error</span>
        <span style={styles.errorMessage}>{query.results.error}</span>
      </div>
    );
  }
  
  const { columns, rows, rowCount } = query.results;
  const totalPages = Math.ceil(rowCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, rowCount);
  const currentRows = rows.slice(startIndex, endIndex);
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Results</span>
        <div style={styles.pagination}>
          <button
            style={styles.pageButton}
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            ««
          </button>
          <button
            style={styles.pageButton}
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            «
          </button>
          <span style={styles.pageInfo}>
            {startIndex + 1} - {endIndex} of {rowCount}
          </span>
          <button
            style={styles.pageButton}
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            »
          </button>
          <button
            style={styles.pageButton}
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            »»
          </button>
        </div>
        <div style={styles.exportActions}>
          <button 
            style={styles.exportButton}
            onClick={() => setShowExportDialog(true)}
          >
            💾 Export
          </button>
        </div>
      </div>
      
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.thIndex}>#</th>
              {columns.map((col, idx) => (
                <th key={idx} style={styles.th}>
                  {col}
                  <span style={styles.columnType}>{query.results?.types[idx]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, rowIdx) => (
              <tr key={rowIdx} style={styles.tr}>
                <td style={styles.tdIndex}>{startIndex + rowIdx + 1}</td>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} style={styles.td}>
                    {formatCellValue(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        result={query.results}
      />
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
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-primary)',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '14px',
    marginBottom: '8px',
  },
  emptyHint: {
    fontSize: '12px',
    opacity: 0.7,
  },
  errorState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent-error)',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  errorTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  errorMessage: {
    fontSize: '13px',
    maxWidth: '600px',
    textAlign: 'center',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
  },
  title: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  pageButton: {
    background: 'transparent',
    padding: '4px 8px',
    borderRadius: '3px',
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  pageInfo: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    padding: '0 8px',
  },
  exportActions: {
    display: 'flex',
    gap: '4px',
  },
  exportButton: {
    background: 'transparent',
    padding: '4px 8px',
    borderRadius: '3px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-color)',
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
  thead: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  th: {
    padding: '8px 12px',
    textAlign: 'left',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    borderBottom: '1px solid var(--border-color)',
    whiteSpace: 'nowrap',
  },
  columnType: {
    display: 'block',
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontWeight: 400,
    marginTop: '2px',
  },
  thIndex: {
    padding: '8px 12px',
    textAlign: 'left',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-muted)',
    fontWeight: 500,
    width: '50px',
    borderBottom: '1px solid var(--border-color)',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
  },
  td: {
    padding: '8px 12px',
    color: 'var(--text-primary)',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tdIndex: {
    padding: '8px 12px',
    color: 'var(--text-muted)',
    width: '50px',
  },
};
