import React, { useState } from 'react';
import { useConnectionStore } from '../stores/connectionStore';
import { DatabaseType } from '../types';

const DB_TYPE_ICONS: Record<string, string> = {
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
  cassandra: '🫛',
  elasticsearch: '🔍',
};

interface SidebarProps {
  onAddConnection: () => void;
}

export function Sidebar({ onAddConnection }: SidebarProps) {
  const { connections, selectConnection, removeConnection, connect, disconnect, selectedConnectionId } = useConnectionStore();
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());
  
  const toggleExpand = (id: string) => {
    setExpandedConnections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const handleConnect = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const connection = connections.find(c => c.id === id);
    if (connection?.status === 'connected') {
      disconnect(id);
    } else {
      await connect(id);
    }
  };
  
  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>
        <h2 style={styles.title}>Databases</h2>
        <button style={styles.addButton} title="Add Connection" onClick={onAddConnection}>
          +
        </button>
      </div>
      
      <div style={styles.connectionList}>
        {connections.length === 0 ? (
          <div style={styles.emptyState}>
            No connections. Click + to add one.
          </div>
        ) : (
          connections.map((connection) => (
            <div key={connection.id} style={styles.connectionItem}>
              <div
                style={{
                  ...styles.connectionHeader,
                  backgroundColor: selectedConnectionId === connection.id ? 'var(--bg-active)' : 'transparent',
                }}
                onClick={() => {
                  toggleExpand(connection.id);
                  selectConnection(connection.id);
                }}
              >
                <span style={styles.expandIcon}>
                  {expandedConnections.has(connection.id) ? '▼' : '▶'}
                </span>
                <span style={styles.dbIcon}>{DB_TYPE_ICONS[connection.type as DatabaseType] || '🗄️'}</span>
                <span style={styles.connectionName}>{connection.name}</span>
                <span style={{...styles.statusDot, backgroundColor: getStatusColor(connection.status)}} />
              </div>
              
              {expandedConnections.has(connection.id) && (
                <div style={styles.connectionDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Host:</span>
                    <span style={styles.detailValue}>{connection.host}:{connection.port}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Database:</span>
                    <span style={styles.detailValue}>{connection.database}</span>
                  </div>
                  <div style={styles.errorRow}>
                    {connection.error && (
                      <span style={styles.errorText}>{connection.error}</span>
                    )}
                  </div>
                  <div style={styles.actions}>
                    <button 
                      style={{
                        ...styles.actionButton,
                        color: connection.status === 'connected' ? 'var(--accent-error)' : 'var(--accent-success)',
                      }}
                      title={connection.status === 'connected' ? 'Disconnect' : 'Connect'}
                      onClick={(e) => handleConnect(e, connection.id)}
                    >
                      {connection.status === 'connected' ? '◼' : '▶'}
                    </button>
                    <button style={styles.actionButton} title="Edit">✏️</button>
                    <button 
                      style={{...styles.actionButton, color: 'var(--accent-error)'}} 
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (connection.status === 'connected') {
                          disconnect(connection.id);
                        }
                        removeConnection(connection.id);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
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
  sidebar: {
    width: 'var(--sidebar-width)',
    backgroundColor: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  addButton: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    backgroundColor: 'var(--accent-primary)',
    color: 'var(--bg-primary)',
    fontSize: '16px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionList: {
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
  connectionItem: {
    marginBottom: '4px',
  },
  connectionHeader: {
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  expandIcon: {
    width: '12px',
    fontSize: '8px',
    color: 'var(--text-muted)',
  },
  dbIcon: {
    fontSize: '14px',
  },
  connectionName: {
    flex: 1,
    fontSize: '13px',
    color: 'var(--text-primary)',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  connectionDetails: {
    padding: '8px 16px 8px 36px',
    backgroundColor: 'var(--bg-tertiary)',
    marginLeft: '16px',
    marginRight: '8px',
    borderRadius: '4px',
  },
  detailRow: {
    display: 'flex',
    fontSize: '11px',
    marginBottom: '4px',
  },
  detailLabel: {
    color: 'var(--text-muted)',
    width: '60px',
  },
  detailValue: {
    color: 'var(--text-secondary)',
    flex: 1,
    wordBreak: 'break-all',
  },
  errorRow: {
    marginTop: '8px',
  },
  errorText: {
    fontSize: '11px',
    color: 'var(--accent-error)',
    backgroundColor: 'rgba(243, 139, 168, 0.1)',
    padding: '4px 8px',
    borderRadius: '4px',
    display: 'block',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
  actionButton: {
    background: 'transparent',
    fontSize: '12px',
    padding: '2px 6px',
    borderRadius: '3px',
    opacity: 0.7,
    transition: 'opacity 0.15s',
  },
};
