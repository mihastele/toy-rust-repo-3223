export interface SqlFormatOptions {
  keywordCase: 'upper' | 'lower' | 'preserve';
  linesBetweenQueries: number;
  maxLineLength: number;
  tabSize: number;
  useTabs: boolean;
}

const DEFAULT_OPTIONS: SqlFormatOptions = {
  keywordCase: 'upper',
  linesBetweenQueries: 1,
  maxLineLength: 80,
  tabSize: 2,
  useTabs: false,
};

const KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
  'IS', 'NULL', 'AS', 'DISTINCT', 'ALL', 'ANY', 'SOME', 'EXISTS', 'JOIN',
  'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'ON', 'CROSS', 'NATURAL',
  'ORDER', 'BY', 'ASC', 'DESC', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET',
  'UNION', 'INTERSECT', 'EXCEPT', 'MINUS', 'INSERT', 'INTO', 'VALUES',
  'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'TRUNCATE',
  'INDEX', 'VIEW', 'SCHEMA', 'DATABASE', 'CONSTRAINT', 'PRIMARY', 'FOREIGN',
  'KEY', 'REFERENCES', 'UNIQUE', 'CHECK', 'DEFAULT', 'CASCADE', 'RESTRICT',
  'NO', 'ACTION', 'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'TRANSACTION',
  'WITH', 'RECURSIVE', 'WINDOW', 'OVER', 'PARTITION', 'RANGE', 'ROWS',
  'FETCH', 'FIRST', 'NEXT', 'ONLY', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'CAST', 'COALESCE', 'NULLIF', 'TRUE', 'FALSE',
]);

export function formatSql(sql: string, options: Partial<SqlFormatOptions> = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const indent = opts.useTabs ? '\t' : ' '.repeat(opts.tabSize);
  
  let formatted = sql.trim();
  
  formatted = preserveStringLiterals(formatted, (cleanSql) => {
    cleanSql = spaceAroundOperators(cleanSql);
    cleanSql = handleClauses(cleanSql, indent);
    cleanSql = handleParentheses(cleanSql, indent);
    cleanSql = handleCommas(cleanSql);
    cleanSql = normalizeKeywords(cleanSql, opts.keywordCase);
    cleanSql = fixSpacing(cleanSql);
    return cleanSql;
  });
  
  formatted = indentFirstLine(formatted);
  formatted = removeExtraBlankLines(formatted, opts.linesBetweenQueries);
  
  return formatted;
}

function preserveStringLiterals(sql: string, callback: (sql: string) => string): string {
  const literals: string[] = [];
  let result = sql;
  
  result = result.replace(/'[^']*'/g, (match) => {
    literals.push(match);
    return `__LITERAL_${literals.length - 1}__`;
  });
  
  result = callback(result);
  
  literals.forEach((lit, i) => {
    result = result.replace(`__LITERAL_${i}__`, lit);
  });
  
  return result;
}

const OPERATORS = ['=', '!=', '<>', '<', '>', '<=', '>=', '+', '-', '*', '/', '%', '^', '||'];

function spaceAroundOperators(sql: string): string {
  let result = sql;
  
  for (const op of OPERATORS) {
    const escapedOp = op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\s*${escapedOp}\\s*`, 'g');
    result = result.replace(regex, ` ${op} `);
  }
  
  return result;
}

function handleClauses(sql: string, indent: string): string {
  const lines = sql.split('\n');
  let currentIndent = '';
  let result: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const upperClause = trimmed.toUpperCase();
    let newIndent = currentIndent;
    
    if (/^(FROM|WHERE|AND|OR|LIMIT|OFFSET|GROUP|HAVING|ORDER|BY|SET|VALUES)$/i.test(upperClause)) {
      if (!/^(AND|OR)$/i.test(upperClause) || currentIndent.includes('WHERE')) {
        newIndent += indent;
      }
    }
    
    if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)$/i.test(upperClause)) {
      newIndent = '';
    }
    
    if (/^\)|,/.test(trimmed) && currentIndent.length > 0) {
      newIndent = currentIndent.slice(0, -indent.length);
    }
    
    result.push(newIndent + trimmed);
    currentIndent = newIndent;
  }
  
  return result.join('\n');
}

function handleParentheses(sql: string, indent: string): string {
  let result = sql;
  
  result = result.replace(/\(\s*/g, ' (\n' + indent);
  result = result.replace(/\s*\)/g, '\n)');
  result = result.replace(/\n\s*\)/g, ')');
  result = result.replace(/\(\n\s+/g, '(\n');
  result = result.replace(/\(\s*SELECT/gi, '(SELECT');
  
  return result;
}

function handleCommas(sql: string): string {
  return sql.replace(/,\s*/g, ',\n  ');
}

function normalizeKeywords(sql: string, caseType: string): string {
  return sql.replace(/\b\w+\b/g, (word) => {
    if (KEYWORDS.has(word.toUpperCase())) {
      return caseType === 'upper' ? word.toUpperCase() : 
             caseType === 'lower' ? word.toLowerCase() : word;
    }
    return word;
  });
}

function fixSpacing(sql: string): string {
  let result = sql;
  
  result = result.replace(/\s+/g, ' ');
  result = result.replace(/\s*,\s*/g, ', ');
  result = result.replace(/\s*\(\s*/g, ' (');
  result = result.replace(/\s*\)\s*/g, ') ');
  
  result = result.trim();
  
  return result;
}

function indentFirstLine(sql: string): string {
  const lines = sql.split('\n');
  return lines.map((line, index) => {
    if (index === 0) return line;
    if (!line.trim()) return '';
    const match = line.match(/^(\s*)/);
    const existingIndent = match ? match[1].length : 0;
    return '  ' + ' '.repeat(existingIndent) + line.trim();
  }).join('\n');
}

function removeExtraBlankLines(sql: string, maxLines: number): string {
  const lines = sql.split('\n');
  let result: string[] = [];
  let blankCount = 0;
  
  for (const line of lines) {
    if (line.trim() === '') {
      blankCount++;
      if (blankCount <= maxLines + 1) {
        result.push('');
      }
    } else {
      blankCount = 0;
      result.push(line);
    }
  }
  
  return result.join('\n').trim();
}

export function minifySql(sql: string): string {
  return sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),;])\s*/g, '$1')
    .replace(/;\s*/g, ';\n')
    .trim();
}

export function generateSelectAll(tableName: string, schema?: string): string {
  const fullName = schema ? `${schema}.${tableName}` : tableName;
  return `SELECT *\nFROM "${fullName}";`;
}

export function generateInsert(tableName: string, columns: string[], schema?: string): string {
  const fullName = schema ? `${schema}.${tableName}` : tableName;
  const colList = columns.map(c => `"${c}"`).join(',\n  ');
  const placeholders = columns.map(() => '?').join(',\n  ');
  return `INSERT INTO "${fullName}"\n  (${colList})\nVALUES\n  (${placeholders});`;
}

export function generateUpdate(tableName: string, columns: string[], whereColumn: string, schema?: string): string {
  const fullName = schema ? `${schema}.${tableName}` : tableName;
  const setClauses = columns.map(c => `  "${c}" = ?`).join(',\n');
  return `UPDATE "${fullName}"\nSET\n${setClauses}\nWHERE "${whereColumn}" = ?;`;
}

export function generateDelete(tableName: string, whereColumn: string, schema?: string): string {
  const fullName = schema ? `${schema}.${tableName}` : tableName;
  return `DELETE FROM "${fullName}"\nWHERE "${whereColumn}" = ?;`;
}

export function generateCreateTable(
  tableName: string,
  columns: { name: string; type: string; nullable?: boolean; default?: string; pk?: boolean }[],
  schema?: string
): string {
  const fullName = schema ? `${schema}.${tableName}` : tableName;
  const colDefs = columns.map(col => {
    let def = `  "${col.name}" ${col.type}`;
    if (!col.nullable) def += ' NOT NULL';
    if (col.default !== undefined) def += ` DEFAULT ${col.default}`;
    if (col.pk) def += ' PRIMARY KEY';
    return def;
  }).join(',\n');
  
  return `CREATE TABLE "${fullName}" (\n${colDefs}\n);`;
}
