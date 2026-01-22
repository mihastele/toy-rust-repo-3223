import React, { useState } from 'react';
import { useQueryStore } from '../stores/queryStore';
import { useConnectionStore } from '../stores/connectionStore';

interface SavedQueriesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery: (sql: string) => void;
}

export function SavedQueriesPanel({ isOpen, onClose, onSelectQuery }: SavedQueriesPanelProps) {
  const { queries, updateQuery, removeQuery, toggleFavorite } = useQueryStore();
  const { connections } = useConnectionStore();
  const [activeTab, setActiveTab] = useState<'favorites' | 'saved' | 'all'>('favorites');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  if (!isOpen) return null;
  
  const allTags = [...new Set(queries.flatMap(q => (q as any).tags || []))];
  
  const filteredQueries = queries.filter(q => {
    if (activeTab === 'favorites' && !q.favorite) return false;
    if (searchTerm && !q.sql.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !((q as any).name?.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
    if (selectedTags.length > 0 && !selectedTags.some(tag => (q as any).tags?.includes(tag))) return false;
    return true;
  });
  
  const getConnectionName = (connectionId: string): string => {
    const conn = connections.find(c => c.id === connectionId);
    return conn?.name || 'Unknown';
  };
  
  const handleLoadQuery = (sql: string) => {
    onSelectQuery(sql);
    onClose();
  };
  
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>💾 Saved Queries</h3>
        <button style={styles.closeButton} onClick={onClose}>×</button>
      </div>
      
      <div style={styles.tabs}>
        {[
          { key: 'favorites', label: '⭐ Favorites' },
          { key: 'saved', label: '📁 Saved' },
          { key: 'all', label: '📋 All' },
        ].map(tab => (
          <button
            key={tab.key}
            style={{
              ...styles.tab,
              backgroundColor: activeTab === tab.key ? 'var(--bg-active)' : 'transparent',
            }}
            onClick={() => setActiveTab(tab.key as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div style={styles.search}>
        <input
          style={styles.searchInput}
          placeholder="Search queries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {allTags.length > 0 && (
        <div style={styles.tags}>
          {allTags.map(tag => (
            <button
              key={tag}
              style={{
                ...styles.tag,
                backgroundColor: selectedTags.includes(tag) ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: selectedTags.includes(tag) ? 'var(--bg-primary)' : 'var(--text-primary)',
              }}
              onClick={() => {
                if (selectedTags.includes(tag)) {
                  setSelectedTags(selectedTags.filter(t => t !== tag));
                } else {
                  setSelectedTags([...selectedTags, tag]);
                }
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      
      <div style={styles.list}>
        {filteredQueries.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📝</span>
            <span>No queries found</span>
            <span style={styles.emptyHint}>
              Mark queries as favorites to save them here
            </span>
          </div>
        ) : (
          filteredQueries.map((query) => (
            <div key={query.id} style={styles.item}>
              <div style={styles.itemHeader}>
                <span style={styles.queryName}>
                  {(query as any).name || 'Untitled Query'}
                </span>
                <div style={styles.itemActions}>
                  <button
                    style={{
                      ...styles.actionButton,
                      color: query.favorite ? 'var(--accent-warning)' : 'var(--text-muted)',
                    }}
                    onClick={() => toggleFavorite(query.id)}
                    title={query.favorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {query.favorite ? '★' : '☆'}
                  </button>
                  <button
                    style={styles.actionButton}
                    onClick={() => handleLoadQuery(query.sql)}
                    title="Load query"
                  >
                    📥
                  </button>
                  <button
                    style={styles.actionButton}
                    onClick={() => {
                      updateQuery(query.id, { 
                        name: `Copy of ${(query as any).name || 'Query'}` 
                      } as any);
                    }}
                    title="Duplicate"
                  >
                    📋
                  </button>
                  <button
                    style={{...styles.actionButton, color: 'var(--accent-error)'}}
                    onClick={() => removeQuery(query.id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div 
                style={styles.sqlPreview}
                onClick={() => handleLoadQuery(query.sql)}
              >
                {query.sql.substring(0, 150)}
                {query.sql.length > 150 && '...'}
              </div>
              
              <div style={styles.itemFooter}>
                <span style={styles.connectionName}>
                  {getConnectionName(query.connectionId)}
                </span>
                {query.executedAt && (
                  <span style={styles.executedAt}>
                    {new Date(query.executedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      <div style={styles.footer}>
        <span style={styles.footerHint}>
          {queries.filter(q => q.favorite).length} favorites · {queries.length} total
        </span>
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
    width: '400px',
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
  closeButton: {
    background: 'transparent',
    fontSize: '20px',
    color: 'var(--text-muted)',
    padding: '4px 8px',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--border-color)',
    padding: '0 8px',
  },
  tab: {
    flex: 1,
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
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
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '8px 16px',
    borderBottom: '1px solid var(--border-color)',
  },
  tag: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    border: 'none',
    cursor: 'pointer',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  queryName: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemActions: {
    display: 'flex',
    gap: '4px',
  },
  actionButton: {
    background: 'transparent',
    fontSize: '12px',
    padding: '2px 6px',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  sqlPreview: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-family)',
    backgroundColor: 'var(--bg-primary)',
    padding: '6px 8px',
    borderRadius: '4px',
    marginBottom: '6px',
    cursor: 'pointer',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  connectionName: {
    color: 'var(--accent-primary)',
  },
  executedAt: {},
  footer: {
    padding: '8px 16px',
    borderTop: '1px solid var(--border-color)',
  },
  footerHint: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
};
