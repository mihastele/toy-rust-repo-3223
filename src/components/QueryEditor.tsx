import React, { useRef, useEffect, useState } from 'react';
import { Query, Connection } from '../types';
import { useQueryStore } from '../stores/queryStore';
import { formatSql, minifySql } from '../utils/sqlFormatter';

interface QueryEditorProps {
  query: Query | undefined;
  connection: Connection | undefined;
}

export function QueryEditor({ query, connection }: QueryEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { executeQuery, updateQuery } = useQueryStore();
  const [isExecuting, setIsExecuting] = useState(false);
  const [formatMode, setFormatMode] = useState<'format' | 'minify'>('format');
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
    
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = query?.sql || '';
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        updateQuery(query!.id, { sql: newValue });
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    }
  };
  
  const handleExecute = async () => {
    if (!query || !connection || connection.status !== 'connected' || isExecuting) return;
    
    setIsExecuting(true);
    try {
      await executeQuery(query.id, query.sql);
    } catch (error) {
      console.error('Query execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };
  
  const handleFormat = () => {
    if (!query) return;
    const sql = formatMode === 'format' 
      ? formatSql(query.sql) 
      : minifySql(query.sql);
    updateQuery(query.id, { sql });
  };
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.tabName}>SQL Query</span>
        <div style={styles.actions}>
          <button 
            style={{
              ...styles.formatButton,
              backgroundColor: formatMode === 'format' ? 'var(--bg-active)' : 'transparent',
            }}
            onClick={() => {
              setFormatMode(formatMode === 'format' ? 'minify' : 'format');
              handleFormat();
            }}
            title={formatMode === 'format' ? 'Format SQL (Ctrl+Shift+F)' : 'Minify SQL'}
          >
            {formatMode === 'format' ? '✨' : '📦'}
          </button>
          <button 
            style={{
              ...styles.executeButton,
              opacity: isExecuting ? 0.5 : 1,
              backgroundColor: connection?.status === 'connected' ? 'var(--accent-success)' : 'var(--bg-active)',
            }}
            onClick={handleExecute}
            disabled={isExecuting || !connection || connection.status !== 'connected'}
          >
            {isExecuting ? '⏳' : '▶'} Execute
          </button>
        </div>
      </div>
      <div style={styles.editorWrapper}>
        <textarea
          ref={textareaRef}
          style={styles.textarea}
          value={query?.sql || ''}
          onChange={(e) => updateQuery(query!.id, { sql: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder={connection ? "Enter your SQL query here...\nPress Ctrl+Enter to execute\nCtrl+Shift+F to format" : "Connect to a database first"}
          disabled={!connection || connection.status !== 'connected'}
          spellCheck={false}
        />
        <div style={styles.lineNumbers}>
          {getLineNumbers(query?.sql || '')}
        </div>
      </div>
      <div style={styles.statusBar}>
        <div style={styles.statusLeft}>
          <span style={styles.statusText}>
            {query?.status === 'idle' && 'Ready'}
            {query?.status === 'running' && 'Executing...'}
            {query?.status === 'completed' && `✓ Completed in ${query.results?.executionTime || 0}ms`}
            {query?.status === 'error' && '✗ Error'}
          </span>
          {query?.results && (
            <span style={styles.rowCount}>
              {query.results.rowCount} rows
            </span>
          )}
        </div>
        <div style={styles.statusRight}>
          <span style={styles.hint}>
            {query?.sql ? `${query.sql.length} chars` : '0 chars'}
          </span>
        </div>
      </div>
    </div>
  );
}

function getLineNumbers(content: string): React.ReactNode {
  const lines = content.split('\n');
  return lines.map((_, i) => (
    <div key={i} style={styles.lineNumber}>{i + 1}</div>
  ));
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    borderBottom: '1px solid var(--border-color)',
    maxHeight: '40%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-tertiary)',
    borderBottom: '1px solid var(--border-color)',
  },
  tabName: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  executeButton: {
    backgroundColor: 'var(--accent-success)',
    color: 'var(--bg-primary)',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  formatButton: {
    background: 'transparent',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    border: '1px solid var(--border-color)',
  },
  editorWrapper: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
  },
  textarea: {
    flex: 1,
    padding: '12px',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: 'none',
    resize: 'none',
    outline: 'none',
    fontFamily: 'var(--font-family)',
    fontSize: '13px',
    lineHeight: '1.6',
    tabSize: 2,
    whiteSpace: 'pre',
    overflow: 'auto',
  },
  lineNumbers: {
    padding: '12px 8px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-family)',
    fontSize: '13px',
    lineHeight: '1.6',
    textAlign: 'right',
    userSelect: 'none',
    minWidth: '40px',
    borderRight: '1px solid var(--border-color)',
  },
  lineNumber: {
    height: '20.8px',
  },
  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 12px',
    backgroundColor: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border-color)',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  statusText: {},
  rowCount: {},
};
