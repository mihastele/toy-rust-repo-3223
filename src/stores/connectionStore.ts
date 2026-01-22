import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { Connection, ConnectionConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ConnectionState {
  connections: Connection[];
  selectedConnectionId: string | null;
  isConnecting: boolean;
  
  loadConnections: () => Promise<void>;
  addConnection: (config: Omit<ConnectionConfig, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateConnection: (id: string, config: Partial<ConnectionConfig>) => void;
  removeConnection: (id: string) => void;
  selectConnection: (id: string | null) => void;
  connect: (id: string) => Promise<void>;
  disconnect: (id: string) => void;
  setConnectionStatus: (id: string, status: Connection['status'], error?: string) => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  selectedConnectionId: null,
  isConnecting: false,
  
  loadConnections: async () => {
    try {
      const connections = await invoke<ConnectionConfig[]>('load_connections');
      set({ connections: connections as Connection[] });
      console.log('[DEBUG] Loaded connections:', connections);
    } catch (error) {
      console.error('[DEBUG] Failed to load connections:', error);
      // Fallback to localStorage if SQLite fails
      const stored = localStorage.getItem('datagrip-connections');
      if (stored) {
        const parsed = JSON.parse(stored);
        set({ connections: parsed.connections });
      }
    }
  },
  
  addConnection: (config) => {
    const id = uuidv4();
    const now = new Date();
    const connection: ConnectionConfig = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    try {
      invoke('save_connection', { connection });
    } catch (error) {
      console.error('[DEBUG] Failed to save to SQLite, using localStorage fallback');
      localStorage.setItem('datagrip-connections', JSON.stringify({
        connections: [...get().connections, { ...connection, status: 'disconnected' }],
      }));
    }
    
    set((state: any) => ({
      connections: [...state.connections, { ...connection, status: 'disconnected' }],
    }));
    return id;
  },
  
  updateConnection: (id, config) => {
    set((state: any) => {
      const updatedConnection = state.connections.find((c: any) => c.id === id);
      if (updatedConnection) {
        const connectionWithUpdates: ConnectionConfig = {
          ...updatedConnection,
          ...config,
          updatedAt: new Date(),
        };
        
        try {
          invoke('save_connection', { connection: connectionWithUpdates });
        } catch (error) {
          console.error('[DEBUG] Failed to save to SQLite, using localStorage fallback');
          localStorage.setItem('datagrip-connections', JSON.stringify({
            connections: state.connections.map((c: any) => c.id === id ? connectionWithUpdates : c)
          }));
        }
      }
      
      return {
        connections: state.connections.map((c: any) =>
          c.id === id ? { ...c, ...config, updatedAt: new Date() } : c
        ),
      };
    });
  },
  
  removeConnection: (id) => {
    try {
      invoke('delete_connection', { id });
    } catch (error) {
      console.error('[DEBUG] Failed to delete from SQLite, using localStorage fallback');
      const connections = get().connections.filter((c: any) => c.id !== id);
      localStorage.setItem('datagrip-connections', JSON.stringify({ connections }));
    }
    set((state: any) => ({
      connections: state.connections.filter((c: any) => c.id !== id),
      selectedConnectionId: state.selectedConnectionId === id ? null : state.selectedConnectionId,
    }));
  },
  selectConnection: (id) => {
    set({ selectedConnectionId: id });
  },
  
  connect: async (id) => {
    const { connections } = get();
    const connection = connections.find((c: any) => c.id === id);
    if (!connection) return;
    
    set({ isConnecting: true });
    get().setConnectionStatus(id, 'connecting');
    
    try {
      const connectionData = {
        id: connection.id,
        name: connection.name,
        type: connection.type,
        host: connection.host,
        port: connection.port,
        database: connection.database,
        username: connection.username,
        password: connection.password || '',
        ssl: connection.ssl || false,
      };
      
      await invoke('connect_database', { connection: connectionData });
      get().setConnectionStatus(id, 'connected');
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      get().setConnectionStatus(id, 'error', errorMessage);
    } finally {
      set({ isConnecting: false });
    }
  },
  
  disconnect: (id) => {
    invoke('disconnect_database', { id });
    get().setConnectionStatus(id, 'disconnected');
  },
  
  setConnectionStatus: (id, status, error) => {
    set((state: any) => ({
      connections: state.connections.map((c: any) =>
        c.id === id ? { ...c, status, error } : c
      ),
    }));
  },
}));
