import React, { useState } from 'react';
import { DatabaseType, ConnectionConfig } from '../types';
import { useConnectionStore } from '../stores/connectionStore';

interface ConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editConnection?: ConnectionConfig;
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

export function ConnectionDialog({ isOpen, onClose, editConnection }: ConnectionDialogProps) {
  const { addConnection, updateConnection } = useConnectionStore();
  const [formData, setFormData] = useState({
    name: editConnection?.name || '',
    type: editConnection?.type || 'postgresql' as DatabaseType,
    host: editConnection?.host || 'localhost',
    port: editConnection?.port || 5432,
    database: editConnection?.database || '',
    username: editConnection?.username || '',
    password: editConnection?.password || '',
    ssl: editConnection?.ssl || false,
    sshHost: '',
    sshPort: 22,
    sshUsername: '',
    sshPassword: '',
    sshPrivateKey: '',
    useSsh: false,
  });
  
  if (!isOpen) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editConnection) {
      updateConnection(editConnection.id, formData);
    } else {
      addConnection(formData);
    }
    
    onClose();
  };
  
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {editConnection ? 'Edit Connection' : 'New Connection'}
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
                    onChange={(e) => handleChange('port', parseInt(e.target.value))}
                    placeholder="5432"
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
                    placeholder="postgres"
                    required
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
                    checked={formData.useSsh}
                    onChange={(e) => handleChange('useSsh', e.target.checked)}
                  />
                  Use SSH Tunnel
                </label>
              </div>
              
              {formData.useSsh && (
                <div style={styles.sshSection}>
                  <div style={styles.sshTitle}>SSH Configuration</div>
                  <div style={styles.row}>
                    <div style={styles.halfSection}>
                      <label style={styles.label}>SSH Host</label>
                      <input
                        style={styles.input}
                        value={formData.sshHost}
                        onChange={(e) => handleChange('sshHost', e.target.value)}
                        placeholder="ssh.example.com"
                      />
                    </div>
                    <div style={styles.halfSection}>
                      <label style={styles.label}>SSH Port</label>
                      <input
                        style={styles.input}
                        type="number"
                        value={formData.sshPort}
                        onChange={(e) => handleChange('sshPort', parseInt(e.target.value))}
                        placeholder="22"
                      />
                    </div>
                  </div>
                  <div style={styles.row}>
                    <div style={styles.halfSection}>
                      <label style={styles.label}>SSH Username</label>
                      <input
                        style={styles.input}
                        value={formData.sshUsername}
                        onChange={(e) => handleChange('sshUsername', e.target.value)}
                        placeholder="ssh_user"
                      />
                    </div>
                    <div style={styles.halfSection}>
                      <label style={styles.label}>SSH Password</label>
                      <input
                        style={styles.input}
                        type="password"
                        value={formData.sshPassword}
                        onChange={(e) => handleChange('sshPassword', e.target.value)}
                        placeholder="ssh_password"
                      />
                    </div>
                  </div>
                  <div style={styles.section}>
                    <label style={styles.label}>Private Key (Optional)</label>
                    <textarea
                      style={{...styles.input, minHeight: '60px', resize: 'vertical'}}
                      value={formData.sshPrivateKey}
                      onChange={(e) => handleChange('sshPrivateKey', e.target.value)}
                      placeholder="-----BEGIN RSA PRIVATE KEY-----"
                    />
                  </div>
                </div>
              )}
            </>
          )}
          
          <div style={styles.actions}>
            <button type="button" style={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" style={styles.submitButton}>
              {editConnection ? 'Save Changes' : 'Create Connection'}
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
