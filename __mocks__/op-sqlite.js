const migrations = new Map();
const debugKv = new Map();
const tables = new Set();
const indexes = new Set();

function result(rows = [], rowsAffected = 0) {
  return {
    rows,
    rowsAffected,
  };
}

function executeSql(sql, params = []) {
  const normalizedSql = sql.replace(/\s+/g, ' ').trim().toLowerCase();

  trackSchemaObject(normalizedSql);

  if (normalizedSql.startsWith('select version from schema_migrations')) {
    return result(
      Array.from(migrations.keys()).map(version => ({ version })),
      0,
    );
  }

  if (normalizedSql.includes('insert into schema_migrations')) {
    migrations.set(params[0], {
      name: params[1],
      applied_at: params[2],
    });
    return result([], 1);
  }

  if (normalizedSql.startsWith('select created_at from debug_kv')) {
    const row = debugKv.get(params[0]);
    return result(row ? [{ created_at: row.created_at }] : [], 0);
  }

  if (normalizedSql.includes('insert or replace into debug_kv')) {
    debugKv.set(params[0], {
      value: params[1],
      created_at: params[2],
      updated_at: params[3],
    });
    return result([], 1);
  }

  if (normalizedSql.startsWith('select value from debug_kv')) {
    const row = debugKv.get(params[0]);
    return result(row ? [{ value: row.value }] : [], 0);
  }

  if (normalizedSql.includes('from sqlite_master')) {
    const type = params[0];
    const names = params.slice(1);
    const source = type === 'index' ? indexes : tables;
    return result(
      names.filter(name => source.has(name)).map(name => ({ name })),
      0,
    );
  }

  return result();
}

function trackSchemaObject(normalizedSql) {
  const tableMatch = normalizedSql.match(
    /^create table if not exists ([a-z_]+)/,
  );
  if (tableMatch) {
    tables.add(tableMatch[1]);
    return;
  }

  const indexMatch = normalizedSql.match(
    /^create index if not exists ([a-z_]+)/,
  );
  if (indexMatch) {
    indexes.add(indexMatch[1]);
  }
}

function createMockDb() {
  return {
    execute(sql, params) {
      return Promise.resolve(executeSql(sql, params));
    },
    transaction(callback) {
      return callback(this);
    },
  };
}

module.exports = {
  open: createMockDb,
};
