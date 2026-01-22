import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { QueryEditor } from './components/QueryEditor';
import { ResultsTable } from './components/ResultsTable';
import { SchemaBrowser } from './components/SchemaBrowser';
import { QueryHistoryPanel } from './components/QueryHistoryPanel';
import { useConnectionStore } from './stores/connectionStore';
import { useQueryStore } from './stores/queryStore';

export default function App() {
  const [showHistory, setShowHistory] = useState(false);
  const { connections, selectedConnectionId } = useConnectionStore();
  const { activeQueryId, queries, updateQuery } = useQueryStore();
  
  const selectedConnection = connections.find(c => c.id === selectedConnectionId);
  const activeQuery = queries.find(q => q.id === activeQueryId);

  const handleSelectFromHistory = (sql: string) => {
    if (activeQuery) {
      updateQuery(activeQuery.id, { sql });
    }
    setShowHistory(false);
  };

  return (
    <div className="app-container">
      <Toolbar 
        connection={selectedConnection} 
        onToggleHistory={() => setShowHistory(!showHistory)}
        showHistory={showHistory}
      />
      <div className="main-content">
        <Sidebar />
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
    </div>
  );
}
