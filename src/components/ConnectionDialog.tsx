import React, { useState } from 'react';
import { DatabaseType, ConnectionConfig } from '../types';
import { useConnectionStore } from '../stores/connectionStore';

interface ConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: Omit<ConnectionConfig, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editingConnectionId?: string | null;
}

const DB_TYPES: { value: DatabaseType; label: string; icon: string }[] = [
  { value: 'sqlite', label: 'SQLite', icon: '🗃️' },
  { value: 'postgresql', label: 'PostgreSQL', icon: '🐘' },
  { value: 'mysql', label: 'MySQL', icon: '🐬' },
  { value: 'mariadb', label: 'MariaDB', icon: '🐬' },
  { value: 'sqlserver', label: 'SQL Server', icon: '📊' },
  { value: 'oracle', label: 'Oracle', icon: '🔶' },
  { value: 'mongodb', label: 'MongoDB', icon: '🍃' },
  { value: 'redis', label: 'Redis', icon: '🔴' },
];

const DEFAULT_PORTS: Record<string, number> = {
  sqlite: 0,
  postgresql: 5432,
  mysql: 3306,
  mariadb: 3306,
  sqlserver: 1433,
  oracle: 1521,
  mongodb: 27017,
  redis: 6379,
};

export function ConnectionDialog({ isOpen, onClose, onSave, editingConnectionId }: ConnectionDialogProps) {
  const { connections } = useConnectionStore();
  const editingConnection = connections.find(c => c.id === editingConnectionId);
  
  const [formData, setFormData] = useState({
    name: editingConnection?.name || '',
    type: editingConnection?.type || 'postgresql' as DatabaseType,
    host: editingConnection?.host || 'localhost',
    port: editingConnection?.port || DEFAULT_PORTS['postgresql'],
    database: editingConnection?.database || '',
    username: editingConnection?.username || '',
    password: editingConnection?.password || '',
    ssl: editingConnection?.ssl || false,
    sshHost: editingConnection?.ssh?.host || '',
    sshPort: editingConnection?.ssh?.port || 22,
    sshUsername: editingConnection?.ssh?.username || '',
    sshPassword: '',
    sshPrivateKey: editingConnection?.ssh?.privateKey || '',
    useSsh: !!editingConnection?.ssh,
    autoConnect: true,
  });
  
  if (!isOpen) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };
  
  const handleChange = (field: string, value: any) => {
    if (field === 'type') {
      setFormData((prev) => ({
        ...prev,
        type: value,
        port: DEFAULT_PORTS[value] || prev.port,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };
  
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {editingConnection ? 'Edit Connection' : 'New Connection'}
          </h2>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.section}>
            <label style={styles.label}>Connection Name</label>
            <input
              style={styles.input}
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="My Database"
              required
            />
          </div>
          
          <div style={styles.section}>
            <label style={styles.label}>Database Type</label>
            <select
              style={styles.select}
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
            >
              {DB_TYPES.map((db) => (
                <option key={db.value} value={db.value}>
                  {db.icon} {db.label}
                </option>
              ))}
            </select>
          </div>
          
          {formData.type !== 'sqlite' && (
            <>
              <div style={styles.row}>
                <div style={styles.halfSection}>
                  <label style={styles.label}>Host</label>
                  <input
                    style={styles.input}
                    value={formData.host}
                    onChange={(e) => handleChange('host', e.target.value)}
                    placeholder="localhost"
                    required
                  />
                </div>
                <div style={styles.halfSection}>
                  <label style={styles.label}>Port</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={formData.port}
                    onChange={(e) => handleChange('port', parseInt(e.target.value) || 0)}
                    placeholder={String(DEFAULT_PORTS[formData.type] || 5432)}
                    required
                  />
                </div>
              </div>
            </>
          )}
          
          <div style={styles.section}>
            <label style={styles.label}>
              {formData.type === 'sqlite' ? 'Database File Path' : 'Database Name'}
            </label>
            <input
              style={styles.input}
              value={formData.database}
              onChange={(e) => handleChange('database', e.target.value)}
              placeholder={formData.type === 'sqlite' ? '/path/to/database.db' : 'mydb'}
              required
            />
          </div>
          
          {formData.type !== 'sqlite' && (
            <>
              <div style={styles.row}>
                <div style={styles.halfSection}>
                  <label style={styles.label}>Username</label>
                  <input
                    style={styles.input}
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    placeholder={formData.type === 'mongodb' ? '' : 'postgres'}
                    required={formData.type !== 'mongodb'}
                  />
                </div>
                <div style={styles.halfSection}>
                  <label style={styles.label}>Password</label>
                  <input
                    style={styles.input}
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="password"
                  />
                </div>
              </div>
              
              <div style={styles.section}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.ssl}
                    onChange={(e) => handleChange('ssl', e.target.checked)}
                  />
                  Use SSL connection
                </label>
              </div>
              
              <div style={styles.section}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.autoConnect}
                    onChange={(e) => handleChange('autoConnect', e.target.checked)}
                  />
                  Auto-connect after creating
                </label>
              </div>
            </>
          )}
          
          <div style={styles.actions}>
            <button type="button" style={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" style={styles.submitButton}>
              {editingConnection ? 'Save Changes' : 'Create Connection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    width: '500px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-color)',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  closeButton: {
    background: 'transparent',
    fontSize: '20px',
    color: 'var(--text-muted)',
    padding: '4px 8px',
  },
  form: {
    padding: '20px',
  },
  section: {
    marginBottom: '16px',
  },
  halfSection: {
    flex: 1,
  },
  row: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-color)',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
  },
  submitButton: {
    padding: '8px 16px',
    backgroundColor: 'var(--accent-primary)',
    border: 'none',
    borderRadius: '4px',
    color: 'var(--bg-primary)',
    fontSize: '13px',
    fontWeight: 500,
  },
  sshSection: {
    padding: '16px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '6px',
    marginTop: '16px',
  },
  sshTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '12px',
  },
};
