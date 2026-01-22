import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Connection, ConnectionConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ConnectionState {
  connections: Connection[];
  selectedConnectionId: string | null;
  isConnecting: boolean;
  
  addConnection: (config: Omit<ConnectionConfig, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateConnection: (id: string, config: Partial<ConnectionConfig>) => void;
  removeConnection: (id: string) => void;
  selectConnection: (id: string | null) => void;
  connect: (id: string) => Promise<void>;
  disconnect: (id: string) => void;
  setConnectionStatus: (id: string, status: Connection['status'], error?: string) => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      connections: [],
      selectedConnectionId: null,
      isConnecting: false,
      
      addConnection: (config) => {
        const id = uuidv4();
        const now = new Date();
        const connection: Connection = {
          ...config,
          id,
          status: 'disconnected',
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          connections: [...state.connections, connection],
        }));
        return id;
      },
      
      updateConnection: (id, config) => {
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === id ? { ...c, ...config, updatedAt: new Date() } : c
          ),
        }));
      },
      
      removeConnection: (id) => {
        set((state) => ({
          connections: state.connections.filter((c) => c.id !== id),
          selectedConnectionId: state.selectedConnectionId === id ? null : state.selectedConnectionId,
        }));
      },
      
      selectConnection: (id) => {
        set({ selectedConnectionId: id });
      },
      
      connect: async (id) => {
        const { connections } = get();
        const connection = connections.find((c) => c.id === id);
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
          
          await window.__TAURI__.invoke('connect_database', { connection: connectionData });
          get().setConnectionStatus(id, 'connected');
        } catch (error: any) {
          const errorMessage = error.message || String(error);
          get().setConnectionStatus(id, 'error', errorMessage);
        } finally {
          set({ isConnecting: false });
        }
      },
      
      disconnect: (id) => {
        window.__TAURI__.invoke('disconnect_database', { id });
        get().setConnectionStatus(id, 'disconnected');
      },
      
      setConnectionStatus: (id, status, error) => {
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === id ? { ...c, status, error } : c
          ),
        }));
      },
    }),
    {
      name: 'datagrip-connections',
      partialize: (state) => ({
        connections: state.connections.map((c) => ({
          ...c,
          password: c.password ? '***hidden***' : undefined,
        })),
      }),
    }
  )
);
