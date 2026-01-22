import React, { useState } from 'react';
import { useQueryStore } from '../stores/queryStore';
import { useConnectionStore } from '../stores/connectionStore';

interface QueryHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery: (sql: string) => void;
}

export function QueryHistoryPanel({ isOpen, onClose, onSelectQuery }: QueryHistoryPanelProps) {
  const { queryHistory, clearHistory } = useQueryStore();
  const { connections } = useConnectionStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen) return null;
  
  const filteredHistory = queryHistory.filter((item) => {
    const matchesSearch = item.sql.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });
  
  const getConnectionName = (connectionId: string): string => {
    const conn = connections.find((c) => c.id === connectionId);
    return conn?.name || 'Unknown';
  };
  
  const formatTime = (date: Date): string => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };
  
  const truncateSQL = (sql: string, maxLength: number = 100): string => {
    if (sql.length <= maxLength) return sql;
    return sql.substring(0, maxLength) + '...';
  };
  
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>Query History</h3>
        <div style={styles.headerActions}>
          <button style={styles.clearButton} onClick={clearHistory}>
            Clear
          </button>
          <button style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
      </div>
      
      <div style={styles.search}>
        <input
          style={styles.searchInput}
          placeholder="Search queries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div style={styles.list}>
        {filteredHistory.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📝</span>
            <span>No query history yet</span>
            <span style={styles.emptyHint}>Your executed queries will appear here</span>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div key={item.id} style={styles.item}>
              <div style={styles.itemHeader}>
                <span style={styles.connectionName}>{getConnectionName(item.connectionId)}</span>
                <span style={styles.timestamp}>{formatTime(item.executedAt)}</span>
                <span style={{
                  ...styles.status,
                  color: item.success ? 'var(--accent-success)' : 'var(--accent-error)'
                }}>
                  {item.success ? '✓' : '✗'}
                </span>
              </div>
              <div 
                style={styles.sql}
                onClick={() => onSelectQuery(item.sql)}
                title={item.sql}
              >
                {truncateSQL(item.sql)}
              </div>
              <div style={styles.itemFooter}>
                <span style={styles.executionTime}>{item.executionTime}ms</span>
                <button 
                  style={styles.copyButton}
                  onClick={() => navigator.clipboard.writeText(item.sql)}
                >
                  📋
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    right: 0,
    top: 'var(--toolbar-height)',
    bottom: 0,
    width: '350px',
    backgroundColor: 'var(--bg-secondary)',
    borderLeft: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color)',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
  },
  clearButton: {
    background: 'transparent',
    fontSize: '12px',
    color: 'var(--text-muted)',
    padding: '4px 8px',
  },
  closeButton: {
    background: 'transparent',
    fontSize: '18px',
    color: 'var(--text-muted)',
    padding: '4px 8px',
  },
  search: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color)',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
  },
  list: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: 'var(--text-muted)',
    fontSize: '13px',
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '12px',
    opacity: 0.5,
  },
  emptyHint: {
    fontSize: '11px',
    opacity: 0.7,
    marginTop: '4px',
  },
  item: {
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '6px',
    padding: '10px',
    marginBottom: '8px',
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
    fontSize: '11px',
  },
  connectionName: {
    color: 'var(--accent-primary)',
    flex: 1,
  },
  timestamp: {
    color: 'var(--text-muted)',
  },
  status: {
    fontSize: '12px',
  },
  sql: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-family)',
    cursor: 'pointer',
    lineHeight: '1.4',
    padding: '6px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '4px',
    marginBottom: '6px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  executionTime: {
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  copyButton: {
    background: 'transparent',
    fontSize: '12px',
    padding: '2px 6px',
    borderRadius: '3px',
    opacity: 0.7,
  },
};
