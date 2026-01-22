import { create } from 'zustand';
import { Query, QueryResult, QueryHistory } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface QueryState {
  queries: Query[];
  activeQueryId: string | null;
  queryHistory: QueryHistory[];
  maxHistorySize: number;
  
  createQuery: (connectionId: string) => string;
  updateQuery: (id: string, updates: Partial<Query>) => void;
  removeQuery: (id: string) => void;
  setActiveQuery: (id: string | null) => void;
  executeQuery: (id: string, sql: string) => Promise<QueryResult>;
  setQueryResult: (id: string, result: QueryResult) => void;
  setQueryError: (id: string, error: string) => void;
  addToHistory: (history: Omit<QueryHistory, 'id'>) => void;
  clearHistory: () => void;
  toggleFavorite: (id: string) => void;
}

export const useQueryStore = create<QueryState>((set, get) => ({
  queries: [],
  activeQueryId: null,
  queryHistory: [],
  maxHistorySize: 500,
  
  createQuery: (connectionId) => {
    const id = uuidv4();
    const query: Query = {
      id,
      connectionId,
      sql: '',
      status: 'idle',
      favorite: false,
    };
    set((state) => ({
      queries: [...state.queries, query],
      activeQueryId: id,
    }));
    return id;
  },
  
  updateQuery: (id, updates) => {
    set((state) => ({
      queries: state.queries.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    }));
  },
  
  removeQuery: (id) => {
    set((state) => ({
      queries: state.queries.filter((q) => q.id !== id),
      activeQueryId: state.activeQueryId === id ? null : state.activeQueryId,
    }));
  },
  
  setActiveQuery: (id) => {
    set({ activeQueryId: id });
  },
  
  executeQuery: async (id, sql) => {
    const startTime = Date.now();
    get().updateQuery(id, { status: 'running' });
    
    try {
      const result = await window.__TAURI__.invoke('execute_query', { id, sql });
      const executionTime = Date.now() - startTime;
      
      const queryResult: QueryResult = {
        ...result,
        executionTime,
      };
      
      get().updateQuery(id, {
        status: 'completed',
        results: queryResult,
        executedAt: new Date(),
      });
      
      get().addToHistory({
        connectionId: get().queries.find((q) => q.id === id)?.connectionId || '',
        sql,
        executedAt: new Date(),
        executionTime,
        success: true,
      });
      
      return queryResult;
    } catch (error: any) {
      get().updateQuery(id, { status: 'error' });
      
      get().addToHistory({
        connectionId: get().queries.find((q) => q.id === id)?.connectionId || '',
        sql,
        executedAt: new Date(),
        executionTime: Date.now() - startTime,
        success: false,
        error: error.message,
      });
      
      throw error;
    }
  },
  
  setQueryResult: (id, result) => {
    get().updateQuery(id, { results: result, status: 'completed' });
  },
  
  setQueryError: (_id: string, _error: string) => {
    get().updateQuery(_id, { status: 'error' });
  },
  
  addToHistory: (entry) => {
    set((state) => {
      const history = [{ ...entry, id: uuidv4() }, ...state.queryHistory];
      if (history.length > state.maxHistorySize) {
        history.splice(state.maxHistorySize);
      }
      return { queryHistory: history };
    });
  },
  
  clearHistory: () => {
    set({ queryHistory: [] });
  },
  
  toggleFavorite: (id) => {
    set((state) => ({
      queries: state.queries.map((q) =>
        q.id === id ? { ...q, favorite: !q.favorite } : q
      ),
    }));
  },
}));
