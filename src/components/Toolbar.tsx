import React from 'react';
import { Connection } from '../types';

interface ToolbarProps {
  connection: Connection | undefined;
  onToggleHistory?: () => void;
  showHistory?: boolean;
  onToggleSaved?: () => void;
  showSaved?: boolean;
}

export function Toolbar({ connection, onToggleHistory, showHistory, onToggleSaved, showSaved }: ToolbarProps) {
  return (
    <header style={styles.toolbar}>
      <div style={styles.left}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🗄️</span>
          <span style={styles.logoText}>DataGrip Alt</span>
        </div>
      </div>
      
      <div style={styles.center}>
        {connection ? (
          <div style={styles.connectionInfo}>
            <span style={styles.dbIcon}>
              {getDbIcon(connection.type)}
            </span>
            <span style={styles.connectionName}>{connection.name}</span>
            <span style={{...styles.statusBadge, backgroundColor: getStatusColor(connection.status)}}>
              {connection.status}
            </span>
          </div>
        ) : (
          <span style={styles.noConnection}>No database selected</span>
        )}
      </div>
      
      <div style={styles.right}>
        <button 
          style={{
            ...styles.toolbarButton,
            backgroundColor: showHistory ? 'var(--bg-active)' : 'transparent',
          }} 
          title="Query History (Ctrl+Shift+H)"
          onClick={onToggleHistory}
        >
          📝
        </button>
        <button 
          style={{
            ...styles.toolbarButton,
            backgroundColor: showSaved ? 'var(--bg-active)' : 'transparent',
          }}
          title="Saved Queries (Ctrl+Shift+S)"
          onClick={onToggleSaved}
        >
          💾
        </button>
        <button style={styles.toolbarButton} title="New Query">
          ➕
        </button>
        <button style={styles.toolbarButton} title="Execute (Ctrl+Enter)">
          ▶
        </button>
        <div style={styles.divider} />
        <button style={styles.toolbarButton} title="Export Results">
          📤
        </button>
        <button style={styles.toolbarButton} title="Settings">
          ⚙️
        </button>
      </div>
    </header>
  );
}

function getDbIcon(type: string): string {
  const icons: Record<string, string> = {
    sqlite: '🗃️',
    postgresql: '🐘',
    mysql: '🐬',
    mariadb: '🐬',
    oracle: '🔶',
    sqlserver: '📊',
    mongodb: '🍃',
    redis: '🔴',
    snowflake: '❄️',
    bigquery: '📈',
  };
  return icons[type] || '🗄️';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'connected': return 'var(--accent-success)';
    case 'connecting': return 'var(--accent-warning)';
    case 'error': return 'var(--accent-error)';
    default: return 'var(--text-muted)';
  }
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    height: 'var(--toolbar-height)',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    fontSize: '20px',
  },
  logoText: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  center: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
  },
  connectionInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--bg-tertiary)',
    padding: '6px 12px',
    borderRadius: '6px',
  },
  dbIcon: {
    fontSize: '14px',
  },
  connectionName: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  statusBadge: {
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '3px',
    color: 'var(--bg-primary)',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  noConnection: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  toolbarButton: {
    background: 'transparent',
    padding: '6px 10px',
    borderRadius: '4px',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    transition: 'all 0.15s',
  },
  divider: {
    width: '1px',
    height: '20px',
    backgroundColor: 'var(--border-color)',
    margin: '0 8px',
  },
};
