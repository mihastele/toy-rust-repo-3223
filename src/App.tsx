import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { QueryEditor } from './components/QueryEditor';
import { ResultsTable } from './components/ResultsTable';
import { SchemaBrowser } from './components/SchemaBrowser';
import { QueryHistoryPanel } from './components/QueryHistoryPanel';
import { ConnectionDialog } from './components/ConnectionDialog';
import { useConnectionStore } from './stores/connectionStore';
import { useQueryStore } from './stores/queryStore';

export default function App() {
  const [showHistory, setShowHistory] = useState(false);
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

  return (
    <div className="app-container">
      <Toolbar 
        connection={selectedConnection} 
        onToggleHistory={() => setShowHistory(!showHistory)}
        showHistory={showHistory}
      />
      <div className="main-content">
        <Sidebar onAddConnection={() => setShowConnectionDialog(true)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <SchemaBrowser connection={selectedConnection} />
          <QueryEditor query={activeQuery} connection={selectedConnection} />
          <ResultsTable query={activeQuery} />
        </div>
      </div>
      <QueryHistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectQuery={handleSelectFromHistory}
      />
      <ConnectionDialog
        isOpen={showConnectionDialog}
        onClose={() => setShowConnectionDialog(false)}
        onSave={handleAddConnection}
      />
    </div>
  );
}
