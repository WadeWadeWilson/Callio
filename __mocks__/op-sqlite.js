const migrations = new Map();
const debugKv = new Map();
const audioItems = new Map();
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

  if (normalizedSql.includes('insert into audio_items')) {
    const row = createAudioItemRow(params);
    audioItems.set(row.id, row);
    return result([], 1);
  }

  if (normalizedSql.startsWith('select count(*) as count from audio_items')) {
    return result([{ count: audioItems.size }], 0);
  }

  if (normalizedSql.includes('from audio_items')) {
    return result(selectAudioItems(normalizedSql, params), 0);
  }

  if (normalizedSql.startsWith('update audio_items')) {
    return updateAudioItem(normalizedSql, params);
  }

  if (normalizedSql.startsWith('delete from audio_items where id = ?')) {
    const deleted = audioItems.delete(params[0]);
    return result([], deleted ? 1 : 0);
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

function createAudioItemRow(params) {
  return {
    id: params[0],
    title: params[1],
    creator: params[2],
    media_type: params[3],
    file_path: params[4],
    cover_path: params[5],
    duration_ms: params[6],
    progress_ms: params[7],
    play_count: params[8],
    is_favorite: params[9],
    is_pinned: params[10],
    file_hash: params[11],
    original_filename: params[12],
    added_at: params[13],
    updated_at: params[14],
    last_played_at: params[15],
    completed_at: params[16],
  };
}

function selectAudioItems(normalizedSql, params) {
  let paramIndex = 0;
  let rows = Array.from(audioItems.values()).map(row => ({ ...row }));

  if (normalizedSql.includes('where id = ?')) {
    const id = params[paramIndex];
    paramIndex += 1;
    rows = rows.filter(row => row.id === id);
  }

  if (normalizedSql.includes('media_type = ?')) {
    const mediaType = params[paramIndex];
    paramIndex += 1;
    rows = rows.filter(row => row.media_type === mediaType);
  }

  if (normalizedSql.includes('is_favorite = ?')) {
    const isFavorite = params[paramIndex];
    paramIndex += 1;
    rows = rows.filter(row => row.is_favorite === isFavorite);
  }

  if (normalizedSql.includes('is_pinned = ?')) {
    const isPinned = params[paramIndex];
    paramIndex += 1;
    rows = rows.filter(row => row.is_pinned === isPinned);
  }

  if (normalizedSql.includes('(title like ? or creator like ?)')) {
    const query = String(params[paramIndex]).replace(/%/g, '').toLowerCase();
    paramIndex += 2;
    rows = rows.filter(row => {
      const title = String(row.title).toLowerCase();
      const creator = row.creator ? String(row.creator).toLowerCase() : '';

      return title.includes(query) || creator.includes(query);
    });
  }

  if (normalizedSql.includes('order by added_at desc')) {
    rows.sort((left, right) => right.added_at.localeCompare(left.added_at));
  }

  let offset = 0;
  let limit;

  if (normalizedSql.includes('limit ?')) {
    limit = params[paramIndex];
    paramIndex += 1;
  }

  if (normalizedSql.includes('offset ?')) {
    offset = params[paramIndex];
  }

  if (limit !== undefined) {
    return rows.slice(offset, offset + limit);
  }

  return rows.slice(offset);
}

function updateAudioItem(normalizedSql, params) {
  const id = params[params.length - 1];
  const row = audioItems.get(id);

  if (!row) {
    return result([], 0);
  }

  if (normalizedSql.includes('play_count = play_count + 1')) {
    row.progress_ms = params[0];
    row.last_played_at = params[1];
    row.updated_at = params[2];
    row.play_count += 1;
    return result([], 1);
  }

  const assignmentSql = normalizedSql
    .slice(normalizedSql.indexOf('set ') + 4, normalizedSql.indexOf(' where '))
    .trim();
  const columns = assignmentSql
    .split(',')
    .map(assignment => assignment.trim().split(' = ')[0]);

  columns.forEach((column, index) => {
    row[column] = params[index];
  });

  return result([], 1);
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
