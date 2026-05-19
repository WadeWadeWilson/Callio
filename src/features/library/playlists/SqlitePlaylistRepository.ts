import { getDatabase } from '../../../storage/database/database';
import type {
  PlaylistItemRow,
  PlaylistRow,
} from '../../../storage/database/schema';
import { nowIso } from '../../../storage/database/sql';
import type {
  DatabaseConnection,
  SqlParams,
  SqlValue,
} from '../../../storage/database/types';
import { AppError } from '../../../utils/errors';
import { createId } from '../../../utils/id';
import { logger } from '../../../utils/logger';
import type { PlaylistRepository } from './PlaylistRepository';
import {
  toPlaylist,
  toPlaylistItem,
  toPlaylistRowBoolean,
} from './playlistMapper';
import type {
  CreatePlaylistInput,
  Playlist,
  PlaylistItem,
  PlaylistListFilter,
  PlaylistWithItems,
  UpdatePlaylistInput,
} from './types';

type CountRow = {
  count: number;
};

type IdRow = {
  id: string;
};

type UpdateField = {
  column: string;
  value: SqlValue;
};

const TEMP_POSITION_OFFSET = 1000000;

const PLAYLIST_SELECT = `
  SELECT
    id,
    name,
    description,
    cover_path,
    is_favorite,
    is_pinned,
    current_audio_item_id,
    current_position_ms,
    created_at,
    updated_at,
    last_played_at
  FROM playlists
`;

const PLAYLIST_ITEM_SELECT = `
  SELECT
    id,
    playlist_id,
    audio_item_id,
    position,
    created_at
  FROM playlist_items
`;

export class SqlitePlaylistRepository implements PlaylistRepository {
  constructor(private readonly db: DatabaseConnection = getDatabase()) {}

  async create(input: CreatePlaylistInput): Promise<Playlist> {
    return this.withDatabaseError('create', async () => {
      const id = createId('playlist');
      const name = this.normalizeName(input.name);
      const timestamp = nowIso();

      await this.db.execute(
        `
          INSERT INTO playlists (
            id,
            name,
            description,
            cover_path,
            is_favorite,
            is_pinned,
            current_audio_item_id,
            current_position_ms,
            created_at,
            updated_at,
            last_played_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          name,
          input.description ?? null,
          input.coverPath ?? null,
          toPlaylistRowBoolean(input.isFavorite ?? false),
          toPlaylistRowBoolean(input.isPinned ?? false),
          null,
          0,
          timestamp,
          timestamp,
          null,
        ],
      );

      return this.requireById(id, 'Created playlist was not found.');
    });
  }

  async getById(id: string): Promise<Playlist | null> {
    return this.withDatabaseError('getById', async () => {
      const row = await this.getRowById(id, this.db);
      return row ? toPlaylist(row) : null;
    });
  }

  async getWithItems(id: string): Promise<PlaylistWithItems | null> {
    return this.withDatabaseError('getWithItems', async () => {
      const playlist = await this.getById(id);

      if (!playlist) {
        return null;
      }

      return {
        playlist,
        items: await this.listItems(id),
      };
    });
  }

  async list(filter: PlaylistListFilter = {}): Promise<Playlist[]> {
    return this.withDatabaseError('list', async () => {
      const where: string[] = [];
      const params: SqlParams = [];

      const searchQuery = filter.searchQuery?.trim();

      if (searchQuery) {
        where.push('(name LIKE ? OR description LIKE ?)');
        const query = `%${searchQuery}%`;
        params.push(query, query);
      }

      if (filter.isFavorite !== undefined) {
        where.push('is_favorite = ?');
        params.push(toPlaylistRowBoolean(filter.isFavorite));
      }

      if (filter.isPinned !== undefined) {
        where.push('is_pinned = ?');
        params.push(toPlaylistRowBoolean(filter.isPinned));
      }

      const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
      const limitSql = this.createLimitSql(filter, params);
      const result = await this.db.query<PlaylistRow>(
        `
          ${PLAYLIST_SELECT}
          ${whereSql}
          ORDER BY updated_at DESC
          ${limitSql}
        `,
        params,
      );

      return result.rows.map(toPlaylist);
    });
  }

  async update(id: string, input: UpdatePlaylistInput): Promise<Playlist> {
    return this.withDatabaseError('update', async () => {
      const fields = this.createUpdateFields(input);
      fields.push({ column: 'updated_at', value: nowIso() });

      await this.executePlaylistUpdate(id, fields, this.db);

      return this.requireById(id, 'Playlist was not found after update.');
    });
  }

  async delete(id: string): Promise<void> {
    await this.withDatabaseError('delete', async () => {
      await this.db.execute('DELETE FROM playlists WHERE id = ?', [id]);
    });
  }

  async count(): Promise<number> {
    return this.withDatabaseError('count', async () => {
      const result = await this.db.query<CountRow>(
        'SELECT COUNT(*) as count FROM playlists',
      );

      return result.rows[0]?.count ?? 0;
    });
  }

  async addItem(
    playlistId: string,
    audioItemId: string,
    position?: number,
  ): Promise<PlaylistItem> {
    return this.withDatabaseError('addItem', async () => {
      let playlistItemId = '';

      await this.db.transaction(async transactionDb => {
        await this.ensurePlaylistExists(playlistId, transactionDb);
        await this.ensureAudioItemExists(audioItemId, transactionDb);

        if (position !== undefined) {
          this.assertNonNegativeInteger(position, 'position');
        }

        const existingItems = await this.getItemRows(playlistId, transactionDb);
        const insertIndex =
          position === undefined
            ? existingItems.length
            : Math.min(position, existingItems.length);
        const timestamp = nowIso();
        playlistItemId = createId('playlist_item');

        await this.moveItemsToTemporaryPositions(playlistId, transactionDb);
        await transactionDb.execute(
          `
            INSERT INTO playlist_items (
              id,
              playlist_id,
              audio_item_id,
              position,
              created_at
            )
            VALUES (?, ?, ?, ?, ?)
          `,
          [playlistItemId, playlistId, audioItemId, -1, timestamp],
        );

        const orderedIds = [
          ...existingItems.slice(0, insertIndex).map(item => item.id),
          playlistItemId,
          ...existingItems.slice(insertIndex).map(item => item.id),
        ];
        await this.writePositions(orderedIds, transactionDb);
        await this.touchPlaylist(playlistId, transactionDb);
      });

      return this.requireItemById(
        playlistItemId,
        'Created playlist item was not found.',
      );
    });
  }

  async removeItem(playlistItemId: string): Promise<void> {
    await this.withDatabaseError('removeItem', async () => {
      await this.db.transaction(async transactionDb => {
        const item = await this.getItemRowById(playlistItemId, transactionDb);

        if (!item) {
          return;
        }

        await transactionDb.execute('DELETE FROM playlist_items WHERE id = ?', [
          playlistItemId,
        ]);
        await this.normalizePositions(item.playlist_id, transactionDb);
        await this.touchPlaylist(item.playlist_id, transactionDb);
      });
    });
  }

  async removeAudioItemFromPlaylist(
    playlistId: string,
    audioItemId: string,
  ): Promise<void> {
    await this.withDatabaseError('removeAudioItemFromPlaylist', async () => {
      await this.db.transaction(async transactionDb => {
        await this.ensurePlaylistExists(playlistId, transactionDb);
        await transactionDb.execute(
          `
            DELETE FROM playlist_items
            WHERE playlist_id = ? AND audio_item_id = ?
          `,
          [playlistId, audioItemId],
        );
        await this.normalizePositions(playlistId, transactionDb);
        await this.touchPlaylist(playlistId, transactionDb);
      });
    });
  }

  async listItems(playlistId: string): Promise<PlaylistItem[]> {
    return this.withDatabaseError('listItems', async () => {
      const rows = await this.getItemRows(playlistId, this.db);
      return rows.map(toPlaylistItem);
    });
  }

  async reorderItems(
    playlistId: string,
    orderedPlaylistItemIds: string[],
  ): Promise<void> {
    await this.withDatabaseError('reorderItems', async () => {
      await this.db.transaction(async transactionDb => {
        await this.ensurePlaylistExists(playlistId, transactionDb);
        const existingItems = await this.getItemRows(playlistId, transactionDb);
        this.assertCompleteReorder(existingItems, orderedPlaylistItemIds);
        await this.moveItemsToTemporaryPositions(playlistId, transactionDb);
        await this.writePositions(orderedPlaylistItemIds, transactionDb);
        await this.touchPlaylist(playlistId, transactionDb);
      });
    });
  }

  async clearItems(playlistId: string): Promise<void> {
    await this.withDatabaseError('clearItems', async () => {
      await this.db.transaction(async transactionDb => {
        await this.ensurePlaylistExists(playlistId, transactionDb);
        await transactionDb.execute(
          'DELETE FROM playlist_items WHERE playlist_id = ?',
          [playlistId],
        );
        await this.touchPlaylist(playlistId, transactionDb);
      });
    });
  }

  async updateResumeState(
    playlistId: string,
    currentAudioItemId: string | null,
    currentPositionMs: number,
  ): Promise<void> {
    await this.withDatabaseError('updateResumeState', async () => {
      this.assertNonNegativeInteger(currentPositionMs, 'currentPositionMs');

      await this.db.transaction(async transactionDb => {
        await this.ensurePlaylistExists(playlistId, transactionDb);

        if (currentAudioItemId) {
          await this.ensureAudioItemExists(currentAudioItemId, transactionDb);
        }

        const timestamp = nowIso();
        await this.executePlaylistUpdate(
          playlistId,
          [
            { column: 'current_audio_item_id', value: currentAudioItemId },
            { column: 'current_position_ms', value: currentPositionMs },
            { column: 'last_played_at', value: timestamp },
            { column: 'updated_at', value: timestamp },
          ],
          transactionDb,
        );
      });
    });
  }

  private async getRowById(
    id: string,
    db: DatabaseConnection,
  ): Promise<PlaylistRow | null> {
    const result = await db.query<PlaylistRow>(
      `
        ${PLAYLIST_SELECT}
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  private async requireById(id: string, message: string): Promise<Playlist> {
    const row = await this.getRowById(id, this.db);

    if (!row) {
      throw new AppError('DATABASE_ERROR', message, { context: { id } });
    }

    return toPlaylist(row);
  }

  private async getItemRowById(
    id: string,
    db: DatabaseConnection,
  ): Promise<PlaylistItemRow | null> {
    const result = await db.query<PlaylistItemRow>(
      `
        ${PLAYLIST_ITEM_SELECT}
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  private async requireItemById(
    id: string,
    message: string,
  ): Promise<PlaylistItem> {
    const row = await this.getItemRowById(id, this.db);

    if (!row) {
      throw new AppError('DATABASE_ERROR', message, { context: { id } });
    }

    return toPlaylistItem(row);
  }

  private async getItemRows(
    playlistId: string,
    db: DatabaseConnection,
  ): Promise<PlaylistItemRow[]> {
    const result = await db.query<PlaylistItemRow>(
      `
        ${PLAYLIST_ITEM_SELECT}
        WHERE playlist_id = ?
        ORDER BY position ASC, created_at ASC
      `,
      [playlistId],
    );

    return result.rows;
  }

  private async normalizePositions(
    playlistId: string,
    db: DatabaseConnection,
  ): Promise<void> {
    const items = await this.getItemRows(playlistId, db);
    await this.moveItemsToTemporaryPositions(playlistId, db);
    await this.writePositions(
      items.map(item => item.id),
      db,
    );
  }

  private async moveItemsToTemporaryPositions(
    playlistId: string,
    db: DatabaseConnection,
  ): Promise<void> {
    const items = await this.getItemRows(playlistId, db);

    for (const [index, item] of items.entries()) {
      await db.execute('UPDATE playlist_items SET position = ? WHERE id = ?', [
        -(TEMP_POSITION_OFFSET + index),
        item.id,
      ]);
    }
  }

  private async writePositions(
    orderedPlaylistItemIds: string[],
    db: DatabaseConnection,
  ): Promise<void> {
    for (const [position, id] of orderedPlaylistItemIds.entries()) {
      await db.execute('UPDATE playlist_items SET position = ? WHERE id = ?', [
        position,
        id,
      ]);
    }
  }

  private async ensurePlaylistExists(
    playlistId: string,
    db: DatabaseConnection,
  ): Promise<void> {
    const result = await db.query<IdRow>(
      'SELECT id FROM playlists WHERE id = ? LIMIT 1',
      [playlistId],
    );

    if (!result.rows[0]) {
      throw new AppError('DATABASE_ERROR', 'Playlist was not found.', {
        context: { playlistId },
      });
    }
  }

  private async ensureAudioItemExists(
    audioItemId: string,
    db: DatabaseConnection,
  ): Promise<void> {
    const result = await db.query<IdRow>(
      'SELECT id FROM audio_items WHERE id = ? LIMIT 1',
      [audioItemId],
    );

    if (!result.rows[0]) {
      throw new AppError('DATABASE_ERROR', 'Audio item was not found.', {
        context: { audioItemId },
      });
    }
  }

  private createUpdateFields(input: UpdatePlaylistInput): UpdateField[] {
    const fields: UpdateField[] = [];

    if (input.name !== undefined) {
      fields.push({ column: 'name', value: this.normalizeName(input.name) });
    }

    if (input.description !== undefined) {
      fields.push({ column: 'description', value: input.description });
    }

    if (input.coverPath !== undefined) {
      fields.push({ column: 'cover_path', value: input.coverPath });
    }

    if (input.isFavorite !== undefined) {
      fields.push({
        column: 'is_favorite',
        value: toPlaylistRowBoolean(input.isFavorite),
      });
    }

    if (input.isPinned !== undefined) {
      fields.push({
        column: 'is_pinned',
        value: toPlaylistRowBoolean(input.isPinned),
      });
    }

    if (input.currentAudioItemId !== undefined) {
      fields.push({
        column: 'current_audio_item_id',
        value: input.currentAudioItemId,
      });
    }

    if (input.currentPositionMs !== undefined) {
      this.assertNonNegativeInteger(
        input.currentPositionMs,
        'currentPositionMs',
      );
      fields.push({
        column: 'current_position_ms',
        value: input.currentPositionMs,
      });
    }

    if (input.lastPlayedAt !== undefined) {
      fields.push({ column: 'last_played_at', value: input.lastPlayedAt });
    }

    return fields;
  }

  private async executePlaylistUpdate(
    id: string,
    fields: UpdateField[],
    db: DatabaseConnection,
  ): Promise<void> {
    const assignments = fields.map(field => `${field.column} = ?`).join(', ');
    const params: SqlParams = [...fields.map(field => field.value), id];

    await db.execute(
      `
        UPDATE playlists
        SET ${assignments}
        WHERE id = ?
      `,
      params,
    );
  }

  private assertCompleteReorder(
    existingItems: PlaylistItemRow[],
    orderedPlaylistItemIds: string[],
  ): void {
    const existingIds = existingItems.map(item => item.id);
    const existingIdSet = new Set(existingIds);
    const orderedIdSet = new Set(orderedPlaylistItemIds);

    if (
      existingItems.length !== orderedPlaylistItemIds.length ||
      orderedIdSet.size !== orderedPlaylistItemIds.length
    ) {
      throw new AppError(
        'DATABASE_ERROR',
        'Playlist reorder must include every item exactly once.',
      );
    }

    const hasOnlyExistingIds = orderedPlaylistItemIds.every(id =>
      existingIdSet.has(id),
    );
    const hasEveryExistingId = existingIds.every(id => orderedIdSet.has(id));

    if (!hasOnlyExistingIds || !hasEveryExistingId) {
      throw new AppError(
        'DATABASE_ERROR',
        'Playlist reorder contains missing or foreign item IDs.',
      );
    }
  }

  private createLimitSql(
    filter: PlaylistListFilter,
    params: SqlParams,
  ): string {
    let sql = '';

    if (filter.limit !== undefined) {
      this.assertNonNegativeInteger(filter.limit, 'limit');
      sql += 'LIMIT ?';
      params.push(filter.limit);
    }

    if (filter.offset !== undefined) {
      this.assertNonNegativeInteger(filter.offset, 'offset');

      if (!sql) {
        sql += 'LIMIT -1';
      }

      sql += ' OFFSET ?';
      params.push(filter.offset);
    }

    return sql;
  }

  private assertNonNegativeInteger(value: number, fieldName: string): void {
    if (!Number.isInteger(value) || value < 0) {
      throw new AppError(
        'DATABASE_ERROR',
        `Playlist ${fieldName} must be a non-negative integer.`,
        { context: { [fieldName]: value } },
      );
    }
  }

  private normalizeName(name: string): string {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new AppError('DATABASE_ERROR', 'Playlist name must not be empty.');
    }

    return normalizedName;
  }

  private async touchPlaylist(
    playlistId: string,
    db: DatabaseConnection,
  ): Promise<void> {
    await this.executePlaylistUpdate(
      playlistId,
      [{ column: 'updated_at', value: nowIso() }],
      db,
    );
  }

  private async withDatabaseError<T>(
    operation: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    try {
      return await callback();
    } catch (error) {
      const appError =
        error instanceof AppError
          ? error
          : new AppError(
              'DATABASE_ERROR',
              `Playlist repository ${operation} failed.`,
              { cause: error },
            );

      logger.error('Playlist repository operation failed', {
        operation,
        code: appError.code,
        errorMessage: appError.message,
      });

      throw appError;
    }
  }
}
