import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { QueryEditor } from './components/QueryEditor';
import { ResultsTable } from './components/ResultsTable';
import { SchemaBrowser } from './components/SchemaBrowser';
import { QueryHistoryPanel } from './components/QueryHistoryPanel';
import { SavedQueriesPanel } from './components/SavedQueriesPanel';
import { ConnectionDialog } from './components/ConnectionDialog';
import { useConnectionStore } from './stores/connectionStore';
import { useQueryStore } from './stores/queryStore';

export default function App() {
  const [showHistory, setShowHistory] = useState(false);
  const [showSavedQueries, setShowSavedQueries] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const { connections, selectedConnectionId, addConnection, connect } = useConnectionStore();
  const { activeQueryId, queries, updateQuery, createQuery } = useQueryStore();
  
  const selectedConnection = connections.find(c => c.id === selectedConnectionId);
  const activeQuery = queries.find(q => q.id === activeQueryId);

  useEffect(() => {
    if (selectedConnectionId && !activeQuery) {
      createQuery(selectedConnectionId);
    }
  }, [selectedConnectionId, activeQueryId, createQuery]);

  const handleSelectFromHistory = (sql: string) => {
    if (activeQuery) {
      updateQuery(activeQuery.id, { sql });
    }
    setShowHistory(false);
  };

  const handleAddConnection = async (config: any) => {
    const id = addConnection(config);
    setShowConnectionDialog(false);
    if (config.autoConnect !== false) {
      await connect(id);
    }
  };

  const handleQuickAction = (action: string, tableName: string) => {
    if (!activeQuery || !selectedConnection) return;
    
    let sql = '';
    switch (action) {
      case 'select':
        sql = `SELECT * FROM "${tableName}" LIMIT 100;`;
        break;
      case 'generate_select':
        sql = `SELECT * FROM "${tableName}" WHERE id = 1;`;
        break;
      case 'generate_insert':
        sql = `INSERT INTO "${tableName}" (column1, column2) VALUES ('value1', 'value2');`;
        break;
      case 'generate_update':
        sql = `UPDATE "${tableName}" SET column1 = 'new_value' WHERE id = 1;`;
        break;
      case 'truncate':
        sql = `TRUNCATE TABLE "${tableName}";`;
        break;
      case 'drop':
        sql = `DROP TABLE IF EXISTS "${tableName}";`;
        break;
      default:
        return;
    }
    
    updateQuery(activeQuery.id, { sql });
  };

  return (
    <div className="app-container">
      <Toolbar 
        connection={selectedConnection} 
        onToggleHistory={() => setShowHistory(!showHistory)}
        showHistory={showHistory}
        onToggleSaved={() => setShowSavedQueries(!showSavedQueries)}
        showSaved={showSavedQueries}
      />
      <div className="main-content">
        <Sidebar onAddConnection={() => setShowConnectionDialog(true)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <SchemaBrowser connection={selectedConnection} onQuickAction={handleQuickAction} />
          <QueryEditor query={activeQuery} connection={selectedConnection} />
          <ResultsTable query={activeQuery} />
        </div>
      </div>
      <QueryHistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectQuery={handleSelectFromHistory}
      />
      <SavedQueriesPanel
        isOpen={showSavedQueries}
        onClose={() => setShowSavedQueries(false)}
        onSelectQuery={(sql) => {
          if (activeQuery) {
            updateQuery(activeQuery.id, { sql });
          }
          setShowSavedQueries(false);
        }}
      />
      <ConnectionDialog
        isOpen={showConnectionDialog}
        onClose={() => setShowConnectionDialog(false)}
        onSave={handleAddConnection}
      />
    </div>
  );
}
