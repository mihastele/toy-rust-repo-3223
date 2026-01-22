import React, { useState, useCallback, useEffect } from 'react';
import { Connection, TableInfo, ColumnInfo } from '../types';
import { useConnectionStore } from '../stores/connectionStore';
import { useQueryStore } from '../stores/queryStore';

interface SchemaBrowserProps {
  connection: Connection | undefined;
  onSelectTable?: (tableName: string) => void;
  onQuickAction?: (action: string, tableName: string) => void;
}

type TreeNode = 
  | { type: 'database'; name: string; children: TreeNode[] }
  | { type: 'schema'; name: string; children: TreeNode[] }
  | { type: 'table'; name: string; table: TableInfo }
  | { type: 'view'; name: string; table: TableInfo }
  | { type: 'column'; name: string; column: ColumnInfo; parent: string };

interface ContextMenuItem {
  type?: 'separator';
  label?: string;
  action?: string;
  shortcut?: string;
  danger?: boolean;
}

export function SchemaBrowser({ connection, onSelectTable, onQuickAction }: SchemaBrowserProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [schemaTree, setSchemaTree] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  
  const { connections } = useConnectionStore();
  const { updateQuery } = useQueryStore();

  useEffect(() => {
    if (connection && connection.status === 'connected') {
      loadSchema();
    } else {
      setSchemaTree(null);
    }
  }, [connection?.id, connection?.status]);

  const loadSchema = async () => {
    if (!connection) return;
    setLoading(true);
    try {
      const result = await window.__TAURI__.invoke('get_schema', { 
        connectionId: connection.id 
      });
      setSchemaTree(buildTree(result, connection.database));
    } catch (error) {
      console.error('Failed to load schema:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (tables: TableInfo[], dbName: string): TreeNode => {
    const schemaGroups: Record<string, TableInfo[]> = {};
    
    tables.forEach((table) => {
      const schema = table.schema || 'public';
      if (!schemaGroups[schema]) {
        schemaGroups[schema] = [];
      }
      schemaGroups[schema].push(table);
    });
    
    const schemaNodes: TreeNode[] = Object.entries(schemaGroups).map(([schema, schemaTables]) => ({
      type: 'schema' as const,
      name: schema,
      children: schemaTables.map((table) => ({
        type: table.type === 'view' ? ('view' as const) : ('table' as const),
        name: table.name,
        table,
      })),
    }));
    
    return {
      type: 'database',
      name: dbName,
      children: schemaNodes,
    };
  };

  const toggleExpand = useCallback((path: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback((item: TreeNode, path: string) => {
    setSelectedItem(path);
    if ((item as any).table) {
      onSelectTable?.((item as any).name);
    }
  }, [onSelectTable]);

  const handleDoubleClick = useCallback((item: TreeNode) => {
    if (item.type === 'table' || item.type === 'view') {
      const query = `SELECT * FROM "${item.name}" LIMIT 100;`;
      
      const conn = connections.find(c => c.id === connection?.id);
      if (conn) {
        const newQuery = {
          id: crypto.randomUUID(),
          connectionId: conn.id,
          sql: query,
          status: 'idle' as const,
          favorite: false,
        };
        updateQuery(newQuery.id, newQuery);
      }
    }
  }, [connection?.id, connections, updateQuery]);

  const showContextMenu = useCallback((e: React.MouseEvent, item: TreeNode, path: string) => {
    e.preventDefault();
    
    if (item.type !== 'table' && item.type !== 'view') return;
    
    const items: ContextMenuItem[] = [
      { label: '🔍 View Data', action: 'select', shortcut: 'Ctrl+Enter' },
      { label: '📝 Edit Data', action: 'edit' },
      { type: 'separator' },
      { label: '🔧 Structure', action: 'structure' },
      { label: '📊 Indexes', action: 'indexes' },
      { label: '🔗 Foreign Keys', action: 'foreign_keys' },
      { type: 'separator' },
      { label: '📄 Generate SELECT', action: 'generate_select' },
      { label: '📄 Generate INSERT', action: 'generate_insert' },
      { label: '📄 Generate UPDATE', action: 'generate_update' },
      { type: 'separator' },
      { label: '🗑️ Truncate Table', action: 'truncate', danger: true },
      { label: '💀 Drop Table', action: 'drop', danger: true },
    ];
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items,
    });
    
    setSelectedItem(path);
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleContextAction = useCallback((action: string) => {
    if (selectedItem) {
      const parts = selectedItem.split('/');
      const tableName = parts[parts.length - 1];
      onQuickAction?.(action, tableName);
    }
    hideContextMenu();
  }, [selectedItem, onQuickAction, hideContextMenu]);

  useEffect(() => {
    const handleClick = () => hideContextMenu();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [hideContextMenu]);

  if (!connection) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.title}>Schema</span>
        </div>
        <div style={styles.emptyState}>
          Connect to a database to view schema
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Schema</span>
        <div style={styles.actions}>
          <button 
            style={styles.actionButton}
            onClick={loadSchema}
            disabled={loading || connection.status !== 'connected'}
            title="Refresh Schema"
          >
            {loading ? '⏳' : '🔄'}
          </button>
          <button 
            style={styles.actionButton}
            onClick={() => onQuickAction?.('create_table', '')}
            title="Create Table"
          >
            ➕
          </button>
        </div>
      </div>
      
      <div style={styles.content}>
        {loading ? (
          <div style={styles.loading}>
            <span>⏳</span> Loading schema...
          </div>
        ) : schemaTree ? (
          <TreeView
            node={schemaTree}
            path={schemaTree.name}
            expandedNodes={expandedNodes}
            selectedItem={selectedItem}
            onToggle={toggleExpand}
            onSelect={handleSelect}
            onDoubleClick={handleDoubleClick}
            onContextMenu={showContextMenu}
            level={0}
          />
        ) : (
          <div style={styles.emptyState}>
            No schema information available
          </div>
        )}
      </div>
      
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onAction={handleContextAction}
          onClose={hideContextMenu}
        />
      )}
    </div>
  );
}

interface TreeViewProps {
  node: TreeNode;
  path: string;
  expandedNodes: Set<string>;
  selectedItem: string | null;
  onToggle: (path: string) => void;
  onSelect: (node: TreeNode, path: string) => void;
  onDoubleClick: (node: TreeNode) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode, path: string) => void;
  level: number;
}

function TreeView({ node, path, expandedNodes, selectedItem, onToggle, onSelect, onDoubleClick, onContextMenu, level }: TreeViewProps) {
  const isExpanded = expandedNodes.has(path);
  const isSelected = selectedItem === path;
  const hasChildren = 'children' in node && (node as any).children.length > 0;
  
  const getNodeStyle = () => ({
    ...styles.treeNode,
    paddingLeft: `${12 + level * 16}px`,
    backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
  });

  const renderContent = () => {
    switch (node.type) {
      case 'database':
        return (
          <>
            <span style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
            <span style={styles.nodeIcon}>🗄️</span>
            <span style={styles.nodeLabel}>{node.name}</span>
          </>
        );
      case 'schema':
        return (
          <>
            <span style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
            <span style={styles.nodeIcon}>📁</span>
            <span style={styles.nodeLabel}>{node.name}</span>
          </>
        );
      case 'table':
        return (
          <>
            <span style={styles.nodeIcon}>📊</span>
            <span style={styles.nodeLabel}>{node.name}</span>
            <span style={styles.rowCount}>{node.table.rowCount !== undefined ? `${node.table.rowCount} rows` : ''}</span>
          </>
        );
      case 'view':
        return (
          <>
            <span style={styles.nodeIcon}>👁️</span>
            <span style={styles.nodeLabel}>{node.name}</span>
          </>
        );
      case 'column':
        const icons: string[] = [];
        if (node.column.isPrimaryKey) icons.push('🔑');
        else if (node.column.isForeignKey) icons.push('🔗');
        
        return (
          <>
            <span style={{
              ...styles.nodeIcon,
              color: node.column.isPrimaryKey ? 'var(--accent-success)' : 
                     node.column.isForeignKey ? 'var(--accent-secondary)' : 'var(--text-muted)'
            }}>
              {icons[0] || '○'}
            </span>
            <span style={styles.nodeLabel}>{node.name}</span>
            <span style={styles.columnType}>{node.column.type}</span>
            {node.column.nullable && <span style={styles.nullable}>?</span>}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div
        style={getNodeStyle()}
        onClick={() => {
          if (hasChildren) onToggle(path);
          onSelect(node, path);
        }}
        onDoubleClick={() => onDoubleClick(node)}
        onContextMenu={(e) => onContextMenu(e, node, path)}
      >
        {renderContent()}
      </div>
      
      {isExpanded && 'children' in node && (
        <div>
          {(node as any).children.map((child: TreeNode, index: number) => (
            <TreeView
              key={index}
              node={child}
              path={`${path}/${child.name}`}
              expandedNodes={expandedNodes}
              selectedItem={selectedItem}
              onToggle={onToggle}
              onSelect={onSelect}
              onDoubleClick={onDoubleClick}
              onContextMenu={onContextMenu}
              level={level + 1}
            />
          ))}
          
          {(() => {
            const tableNode = node as any;
            if (tableNode.type !== 'table' || !tableNode.table) return null;
            return tableNode.table.columns.map((col: ColumnInfo, idx: number) => (
              <TreeView
                key={`col-${idx}`}
                node={{
                  type: 'column' as const,
                  name: col.name,
                  column: col,
                  parent: tableNode.name,
                }}
                path={`${path}/${col.name}`}
                expandedNodes={expandedNodes}
                selectedItem={selectedItem}
                onToggle={onToggle}
                onSelect={onSelect}
                onDoubleClick={onDoubleClick}
                onContextMenu={onContextMenu}
                level={level + 1}
              />
            ));
          })()}
        </div>
      )}
    </div>
  );
}

function ContextMenu({ x, y, items, onAction }: { x: number; y: number; items: ContextMenuItem[]; onAction: (action: string) => void; onClose: () => void }) {
  return (
    <div
      style={{
        ...styles.contextMenu,
        left: x,
        top: y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => (
        item.type === 'separator' ? (
          <div key={index} style={styles.contextMenuSeparator} />
        ) : (
          <button
            key={index}
            style={{
              ...styles.contextMenuItem,
              color: item.danger ? 'var(--accent-error)' : 'var(--text-primary)',
            }}
            onClick={() => item.action && onAction(item.action)}
          >
            <span>{item.label}</span>
            {item.shortcut && <span style={styles.shortcut}>{item.shortcut}</span>}
          </button>
        )
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '280px',
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
  actions: {
    display: 'flex',
    gap: '4px',
  },
  actionButton: {
    background: 'transparent',
    fontSize: '12px',
    padding: '4px',
    borderRadius: '3px',
    opacity: 0.7,
  },
  content: {
    flex: 1,
    overflow: 'auto',
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '12px',
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  treeNode: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.15s',
  },
  expandIcon: {
    width: '12px',
    fontSize: '8px',
    color: 'var(--text-muted)',
  },
  nodeIcon: {
    fontSize: '12px',
  },
  nodeLabel: {
    flex: 1,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowCount: {
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  columnType: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginLeft: 'auto',
  },
  nullable: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginLeft: '4px',
  },
  contextMenu: {
    position: 'fixed',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '4px 0',
    minWidth: '180px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
  },
  contextMenuItem: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    padding: '6px 12px',
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    fontSize: '12px',
    cursor: 'pointer',
  },
  contextMenuSeparator: {
    height: '1px',
    backgroundColor: 'var(--border-color)',
    margin: '4px 0',
  },
  shortcut: {
    color: 'var(--text-muted)',
    fontSize: '10px',
  },
};
