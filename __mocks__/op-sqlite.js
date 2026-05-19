const migrations = new Map();
const debugKv = new Map();
const audioItems = new Map();
const tags = new Map();
const audioItemTags = new Set();
const playlists = new Map();
const playlistItems = new Map();
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

  if (normalizedSql.startsWith('update audio_items')) {
    return updateAudioItem(normalizedSql, params);
  }

  if (normalizedSql.startsWith('delete from audio_items where id = ?')) {
    const deleted = audioItems.delete(params[0]);
    deleteAudioItemTagLinksForAudioItem(params[0]);
    deletePlaylistItemsForAudioItem(params[0]);
    return result([], deleted ? 1 : 0);
  }

  if (normalizedSql.includes('from audio_items')) {
    return result(selectAudioItems(normalizedSql, params), 0);
  }

  if (normalizedSql.includes('insert into tags')) {
    const row = createTagRow(params);
    assertUniqueTagName(row.name, row.id);
    tags.set(row.id, row);
    return result([], 1);
  }

  if (normalizedSql.startsWith('select count(*) as count from tags')) {
    return result([{ count: tags.size }], 0);
  }

  if (normalizedSql.startsWith('update tags')) {
    return updateTag(normalizedSql, params);
  }

  if (normalizedSql.startsWith('delete from tags where id = ?')) {
    const deleted = tags.delete(params[0]);
    deleteAudioItemTagLinksForTag(params[0]);
    return result([], deleted ? 1 : 0);
  }

  if (normalizedSql.includes('inner join audio_item_tags')) {
    return result(selectTagsForAudioItem(params[0]), 0);
  }

  if (normalizedSql.includes('from tags')) {
    return result(selectTags(normalizedSql, params), 0);
  }

  if (normalizedSql.includes('insert into playlists')) {
    const row = createPlaylistRow(params);
    playlists.set(row.id, row);
    return result([], 1);
  }

  if (normalizedSql.startsWith('select count(*) as count from playlists')) {
    return result([{ count: playlists.size }], 0);
  }

  if (normalizedSql.startsWith('update playlists')) {
    return updatePlaylist(normalizedSql, params);
  }

  if (normalizedSql.startsWith('delete from playlists where id = ?')) {
    const deleted = playlists.delete(params[0]);
    deletePlaylistItemsForPlaylist(params[0]);
    return result([], deleted ? 1 : 0);
  }

  if (normalizedSql.includes('from playlists')) {
    return result(selectPlaylists(normalizedSql, params), 0);
  }

  if (normalizedSql.includes('insert into playlist_items')) {
    return insertPlaylistItem(params);
  }

  if (normalizedSql.startsWith('update playlist_items')) {
    return updatePlaylistItem(normalizedSql, params);
  }

  if (normalizedSql.startsWith('delete from playlist_items where id = ?')) {
    const deleted = playlistItems.delete(params[0]);
    return result([], deleted ? 1 : 0);
  }

  if (
    normalizedSql.startsWith(
      'delete from playlist_items where playlist_id = ? and audio_item_id = ?',
    )
  ) {
    return deletePlaylistItemsForPlaylistAndAudioItem(params[0], params[1]);
  }

  if (
    normalizedSql.startsWith('delete from playlist_items where playlist_id = ?')
  ) {
    return result([], deletePlaylistItemsForPlaylist(params[0]));
  }

  if (normalizedSql.includes('from playlist_items')) {
    return result(selectPlaylistItems(normalizedSql, params), 0);
  }

  if (normalizedSql.includes('insert or ignore into audio_item_tags')) {
    return insertAudioItemTag(params[0], params[1]);
  }

  if (
    normalizedSql.startsWith(
      'delete from audio_item_tags where audio_item_id = ? and tag_id = ?',
    )
  ) {
    const deleted = audioItemTags.delete(
      createAudioItemTagKey(params[0], params[1]),
    );
    return result([], deleted ? 1 : 0);
  }

  if (
    normalizedSql.startsWith(
      'delete from audio_item_tags where audio_item_id = ?',
    )
  ) {
    const count = deleteAudioItemTagLinksForAudioItem(params[0]);
    return result([], count);
  }

  if (normalizedSql.includes('from audio_item_tags where tag_id = ?')) {
    return result(selectAudioItemIdsForTag(params[0]), 0);
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

  return applyLimitOffset(rows, normalizedSql, params, paramIndex);
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

  updateRowFromAssignments(row, normalizedSql, params);
  return result([], 1);
}

function createTagRow(params) {
  return {
    id: params[0],
    name: params[1],
    color: params[2],
    is_favorite: params[3],
    is_pinned: params[4],
    created_at: params[5],
    updated_at: params[6],
  };
}

function selectTags(normalizedSql, params) {
  let paramIndex = 0;
  let rows = Array.from(tags.values()).map(row => ({ ...row }));

  if (normalizedSql.includes('where id = ?')) {
    const id = params[paramIndex];
    paramIndex += 1;
    rows = rows.filter(row => row.id === id);
  }

  if (normalizedSql.includes('lower(name) = lower(?)')) {
    const name = String(params[paramIndex]).toLowerCase();
    paramIndex += 1;
    rows = rows.filter(row => row.name.toLowerCase() === name);
  }

  if (normalizedSql.includes('name like ?')) {
    const query = String(params[paramIndex]).replace(/%/g, '').toLowerCase();
    paramIndex += 1;
    rows = rows.filter(row => row.name.toLowerCase().includes(query));
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

  if (normalizedSql.includes('order by name')) {
    rows.sort((left, right) => left.name.localeCompare(right.name));
  }

  return applyLimitOffset(rows, normalizedSql, params, paramIndex);
}

function updateTag(normalizedSql, params) {
  const id = params[params.length - 1];
  const row = tags.get(id);

  if (!row) {
    return result([], 0);
  }

  const assignmentSql = normalizedSql
    .slice(normalizedSql.indexOf('set ') + 4, normalizedSql.indexOf(' where '))
    .trim();
  const columns = assignmentSql
    .split(',')
    .map(assignment => assignment.trim().split(' = ')[0]);
  const nameIndex = columns.indexOf('name');

  if (nameIndex >= 0) {
    assertUniqueTagName(params[nameIndex], id);
  }

  columns.forEach((column, index) => {
    row[column] = params[index];
  });

  return result([], 1);
}

function createPlaylistRow(params) {
  return {
    id: params[0],
    name: params[1],
    description: params[2],
    cover_path: params[3],
    is_favorite: params[4],
    is_pinned: params[5],
    current_audio_item_id: params[6],
    current_position_ms: params[7],
    created_at: params[8],
    updated_at: params[9],
    last_played_at: params[10],
  };
}

function selectPlaylists(normalizedSql, params) {
  let paramIndex = 0;
  let rows = Array.from(playlists.values()).map(row => ({ ...row }));

  if (normalizedSql.includes('where id = ?')) {
    const id = params[paramIndex];
    paramIndex += 1;
    rows = rows.filter(row => row.id === id);
  }

  if (normalizedSql.includes('(name like ? or description like ?)')) {
    const query = String(params[paramIndex]).replace(/%/g, '').toLowerCase();
    paramIndex += 2;
    rows = rows.filter(row => {
      const name = String(row.name).toLowerCase();
      const description = row.description
        ? String(row.description).toLowerCase()
        : '';

      return name.includes(query) || description.includes(query);
    });
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

  if (normalizedSql.includes('order by updated_at desc')) {
    rows.sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  }

  return applyLimitOffset(rows, normalizedSql, params, paramIndex);
}

function updatePlaylist(normalizedSql, params) {
  const id = params[params.length - 1];
  const row = playlists.get(id);

  if (!row) {
    return result([], 0);
  }

  updateRowFromAssignments(row, normalizedSql, params);
  return result([], 1);
}

function insertPlaylistItem(params) {
  const row = createPlaylistItemRow(params);

  if (!playlists.has(row.playlist_id) || !audioItems.has(row.audio_item_id)) {
    throw new Error('FOREIGN KEY constraint failed');
  }

  playlistItems.set(row.id, row);
  return result([], 1);
}

function createPlaylistItemRow(params) {
  return {
    id: params[0],
    playlist_id: params[1],
    audio_item_id: params[2],
    position: params[3],
    created_at: params[4],
  };
}

function selectPlaylistItems(normalizedSql, params) {
  let rows = Array.from(playlistItems.values()).map(row => ({ ...row }));

  if (normalizedSql.includes('where id = ?')) {
    rows = rows.filter(row => row.id === params[0]);
  }

  if (normalizedSql.includes('where playlist_id = ?')) {
    rows = rows.filter(row => row.playlist_id === params[0]);
  }

  if (normalizedSql.includes('order by position asc')) {
    rows.sort((left, right) => {
      if (left.position !== right.position) {
        return left.position - right.position;
      }

      return left.created_at.localeCompare(right.created_at);
    });
  }

  return rows;
}

function updatePlaylistItem(normalizedSql, params) {
  const id = params[params.length - 1];
  const row = playlistItems.get(id);

  if (!row) {
    return result([], 0);
  }

  updateRowFromAssignments(row, normalizedSql, params);
  return result([], 1);
}

function selectTagsForAudioItem(audioItemId) {
  const rows = [];

  audioItemTags.forEach(key => {
    const [linkedAudioItemId, tagId] = key.split('::');

    if (linkedAudioItemId === audioItemId) {
      const tag = tags.get(tagId);

      if (tag) {
        rows.push({ ...tag });
      }
    }
  });

  return rows.sort((left, right) => left.name.localeCompare(right.name));
}

function insertAudioItemTag(audioItemId, tagId) {
  if (!audioItems.has(audioItemId) || !tags.has(tagId)) {
    throw new Error('FOREIGN KEY constraint failed');
  }

  const key = createAudioItemTagKey(audioItemId, tagId);
  const existed = audioItemTags.has(key);
  audioItemTags.add(key);

  return result([], existed ? 0 : 1);
}

function selectAudioItemIdsForTag(tagId) {
  return Array.from(audioItemTags)
    .map(key => key.split('::'))
    .filter(([, linkedTagId]) => linkedTagId === tagId)
    .map(([audioItemId]) => ({ audio_item_id: audioItemId }))
    .sort((left, right) =>
      left.audio_item_id.localeCompare(right.audio_item_id),
    );
}

function deleteAudioItemTagLinksForAudioItem(audioItemId) {
  let count = 0;

  audioItemTags.forEach(key => {
    if (key.startsWith(`${audioItemId}::`)) {
      audioItemTags.delete(key);
      count += 1;
    }
  });

  return count;
}

function deleteAudioItemTagLinksForTag(tagId) {
  let count = 0;

  audioItemTags.forEach(key => {
    if (key.endsWith(`::${tagId}`)) {
      audioItemTags.delete(key);
      count += 1;
    }
  });

  return count;
}

function deletePlaylistItemsForPlaylist(playlistId) {
  let count = 0;

  playlistItems.forEach((item, id) => {
    if (item.playlist_id === playlistId) {
      playlistItems.delete(id);
      count += 1;
    }
  });

  return count;
}

function deletePlaylistItemsForAudioItem(audioItemId) {
  let count = 0;

  playlistItems.forEach((item, id) => {
    if (item.audio_item_id === audioItemId) {
      playlistItems.delete(id);
      count += 1;
    }
  });

  return count;
}

function deletePlaylistItemsForPlaylistAndAudioItem(playlistId, audioItemId) {
  let count = 0;

  playlistItems.forEach((item, id) => {
    if (item.playlist_id === playlistId && item.audio_item_id === audioItemId) {
      playlistItems.delete(id);
      count += 1;
    }
  });

  return result([], count);
}

function createAudioItemTagKey(audioItemId, tagId) {
  return `${audioItemId}::${tagId}`;
}

function assertUniqueTagName(name, currentId) {
  const normalizedName = String(name).toLowerCase();
  const duplicate = Array.from(tags.values()).some(
    tag => tag.id !== currentId && tag.name.toLowerCase() === normalizedName,
  );

  if (duplicate) {
    throw new Error('UNIQUE constraint failed: tags.name');
  }
}

function updateRowFromAssignments(row, normalizedSql, params) {
  const assignmentSql = normalizedSql
    .slice(normalizedSql.indexOf('set ') + 4, normalizedSql.indexOf(' where '))
    .trim();
  const columns = assignmentSql
    .split(',')
    .map(assignment => assignment.trim().split(' = ')[0]);

  columns.forEach((column, index) => {
    row[column] = params[index];
  });
}

function applyLimitOffset(rows, normalizedSql, params, paramIndex) {
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
