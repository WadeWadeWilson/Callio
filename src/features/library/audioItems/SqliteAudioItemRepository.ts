import { getDatabase } from '../../../storage/database/database';
import type { AudioItemRow } from '../../../storage/database/schema';
import { nowIso } from '../../../storage/database/sql';
import type {
  DatabaseConnection,
  SqlParams,
  SqlValue,
} from '../../../storage/database/types';
import { AppError } from '../../../utils/errors';
import { createId } from '../../../utils/id';
import { logger } from '../../../utils/logger';
import type { AudioItemRepository } from './AudioItemRepository';
import { toAudioItem, toAudioItemRowBooleans } from './audioItemMapper';
import type {
  AudioItem,
  AudioItemListFilter,
  CreateAudioItemInput,
  UpdateAudioItemInput,
} from './types';

type CountRow = {
  count: number;
};

type UpdateField = {
  column: string;
  value: SqlValue;
};

const AUDIO_ITEM_SELECT = `
  SELECT
    id,
    title,
    creator,
    media_type,
    file_path,
    cover_path,
    duration_ms,
    progress_ms,
    play_count,
    is_favorite,
    is_pinned,
    file_hash,
    original_filename,
    added_at,
    updated_at,
    last_played_at,
    completed_at
  FROM audio_items
`;

export class SqliteAudioItemRepository implements AudioItemRepository {
  constructor(private readonly db: DatabaseConnection = getDatabase()) {}

  async create(input: CreateAudioItemInput): Promise<AudioItem> {
    return this.withDatabaseError('create', async () => {
      const id = createId('audio');
      const timestamp = nowIso();

      await this.db.execute(
        `
          INSERT INTO audio_items (
            id,
            title,
            creator,
            media_type,
            file_path,
            cover_path,
            duration_ms,
            progress_ms,
            play_count,
            is_favorite,
            is_pinned,
            file_hash,
            original_filename,
            added_at,
            updated_at,
            last_played_at,
            completed_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          input.title,
          input.creator ?? null,
          input.mediaType,
          input.filePath,
          input.coverPath ?? null,
          input.durationMs ?? 0,
          0,
          0,
          0,
          0,
          input.fileHash ?? null,
          input.originalFilename ?? null,
          timestamp,
          timestamp,
          null,
          null,
        ],
      );

      return this.requireById(id, 'Created audio item was not found.');
    });
  }

  async getById(id: string): Promise<AudioItem | null> {
    return this.withDatabaseError('getById', async () => {
      const row = await this.getRowById(id);
      return row ? toAudioItem(row) : null;
    });
  }

  async list(filter: AudioItemListFilter = {}): Promise<AudioItem[]> {
    return this.withDatabaseError('list', async () => {
      const where: string[] = [];
      const params: SqlParams = [];

      if (filter.mediaType) {
        where.push('media_type = ?');
        params.push(filter.mediaType);
      }

      if (filter.isFavorite !== undefined) {
        where.push('is_favorite = ?');
        params.push(toAudioItemRowBooleans(filter.isFavorite));
      }

      if (filter.isPinned !== undefined) {
        where.push('is_pinned = ?');
        params.push(toAudioItemRowBooleans(filter.isPinned));
      }

      const searchQuery = filter.searchQuery?.trim();

      if (searchQuery) {
        where.push('(title LIKE ? OR creator LIKE ?)');
        const query = `%${searchQuery}%`;
        params.push(query, query);
      }

      const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
      const limitSql = this.createLimitSql(filter, params);
      const result = await this.db.query<AudioItemRow>(
        `
          ${AUDIO_ITEM_SELECT}
          ${whereSql}
          ORDER BY added_at DESC
          ${limitSql}
        `,
        params,
      );

      return result.rows.map(toAudioItem);
    });
  }

  async update(id: string, input: UpdateAudioItemInput): Promise<AudioItem> {
    return this.withDatabaseError('update', async () => {
      const fields = this.createUpdateFields(input);
      fields.push({ column: 'updated_at', value: nowIso() });

      await this.executeUpdate(id, fields);

      return this.requireById(id, 'Audio item was not found after update.');
    });
  }

  async delete(id: string): Promise<void> {
    await this.withDatabaseError('delete', async () => {
      await this.db.execute('DELETE FROM audio_items WHERE id = ?', [id]);
    });
  }

  async count(): Promise<number> {
    return this.withDatabaseError('count', async () => {
      const result = await this.db.query<CountRow>(
        'SELECT COUNT(*) as count FROM audio_items',
      );

      return result.rows[0]?.count ?? 0;
    });
  }

  async updateProgress(id: string, progressMs: number): Promise<void> {
    await this.withDatabaseError('updateProgress', async () => {
      await this.executeUpdate(id, [
        { column: 'progress_ms', value: progressMs },
        { column: 'updated_at', value: nowIso() },
      ]);
      await this.ensureExists(
        id,
        'Audio item was not found after progress update.',
      );
    });
  }

  async markPlayed(id: string, progressMs: number): Promise<void> {
    await this.withDatabaseError('markPlayed', async () => {
      const timestamp = nowIso();

      await this.db.execute(
        `
          UPDATE audio_items
          SET
            progress_ms = ?,
            last_played_at = ?,
            updated_at = ?,
            play_count = play_count + 1
          WHERE id = ?
        `,
        [progressMs, timestamp, timestamp, id],
      );

      await this.ensureExists(
        id,
        'Audio item was not found after mark played.',
      );
    });
  }

  async setFavorite(id: string, isFavorite: boolean): Promise<void> {
    await this.withDatabaseError('setFavorite', async () => {
      await this.executeUpdate(id, [
        { column: 'is_favorite', value: toAudioItemRowBooleans(isFavorite) },
        { column: 'updated_at', value: nowIso() },
      ]);
      await this.ensureExists(
        id,
        'Audio item was not found after favorite update.',
      );
    });
  }

  async setPinned(id: string, isPinned: boolean): Promise<void> {
    await this.withDatabaseError('setPinned', async () => {
      await this.executeUpdate(id, [
        { column: 'is_pinned', value: toAudioItemRowBooleans(isPinned) },
        { column: 'updated_at', value: nowIso() },
      ]);
      await this.ensureExists(
        id,
        'Audio item was not found after pinned update.',
      );
    });
  }

  private async getRowById(id: string): Promise<AudioItemRow | null> {
    const result = await this.db.query<AudioItemRow>(
      `
        ${AUDIO_ITEM_SELECT}
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  private async requireById(id: string, message: string): Promise<AudioItem> {
    const row = await this.getRowById(id);

    if (!row) {
      throw new AppError('DATABASE_ERROR', message, { context: { id } });
    }

    return toAudioItem(row);
  }

  private async ensureExists(id: string, message: string): Promise<void> {
    const row = await this.getRowById(id);

    if (!row) {
      throw new AppError('DATABASE_ERROR', message, { context: { id } });
    }
  }

  private createUpdateFields(input: UpdateAudioItemInput): UpdateField[] {
    const fields: UpdateField[] = [];

    if (input.title !== undefined) {
      fields.push({ column: 'title', value: input.title });
    }

    if (input.creator !== undefined) {
      fields.push({ column: 'creator', value: input.creator });
    }

    if (input.mediaType !== undefined) {
      fields.push({ column: 'media_type', value: input.mediaType });
    }

    if (input.coverPath !== undefined) {
      fields.push({ column: 'cover_path', value: input.coverPath });
    }

    if (input.durationMs !== undefined) {
      fields.push({ column: 'duration_ms', value: input.durationMs });
    }

    if (input.progressMs !== undefined) {
      fields.push({ column: 'progress_ms', value: input.progressMs });
    }

    if (input.playCount !== undefined) {
      fields.push({ column: 'play_count', value: input.playCount });
    }

    if (input.isFavorite !== undefined) {
      fields.push({
        column: 'is_favorite',
        value: toAudioItemRowBooleans(input.isFavorite),
      });
    }

    if (input.isPinned !== undefined) {
      fields.push({
        column: 'is_pinned',
        value: toAudioItemRowBooleans(input.isPinned),
      });
    }

    if (input.lastPlayedAt !== undefined) {
      fields.push({ column: 'last_played_at', value: input.lastPlayedAt });
    }

    if (input.completedAt !== undefined) {
      fields.push({ column: 'completed_at', value: input.completedAt });
    }

    return fields;
  }

  private async executeUpdate(
    id: string,
    fields: UpdateField[],
  ): Promise<void> {
    const assignments = fields.map(field => `${field.column} = ?`).join(', ');
    const params: SqlParams = [...fields.map(field => field.value), id];

    await this.db.execute(
      `
        UPDATE audio_items
        SET ${assignments}
        WHERE id = ?
      `,
      params,
    );
  }

  private createLimitSql(
    filter: AudioItemListFilter,
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
        `Audio item ${fieldName} must be a non-negative integer.`,
        { context: { [fieldName]: value } },
      );
    }
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
              `Audio item repository ${operation} failed.`,
              { cause: error },
            );

      logger.error('Audio item repository operation failed', {
        operation,
        code: appError.code,
        errorMessage: appError.message,
      });

      throw appError;
    }
  }
}
