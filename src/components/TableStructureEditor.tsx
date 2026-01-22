  const [indexes, setIndexes] = useState<IndexDefinition[]>([
    { id: 'idx_1', name: 'idx_users_email', columns: ['email'], unique: true, type: 'BTREE' },
    { id: 'idx_2', name: 'idx_users_name', columns: ['last_name', 'first_name'], unique: false, type: 'BTREE' },
  ]);
  
  const [newIndex, setNewIndex] = useState<Omit<IndexDefinition, 'id'>>({
    name: '',
    columns: [],
    unique: false,
    type: 'BTREE',
  });