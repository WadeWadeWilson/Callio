import { getDatabase } from '../../../storage/database/database';
import type { TagRow } from '../../../storage/database/schema';
import { nowIso } from '../../../storage/database/sql';
import type {
  DatabaseConnection,
  SqlParams,
  SqlValue,
} from '../../../storage/database/types';
import { AppError } from '../../../utils/errors';
import { createId } from '../../../utils/id';
import { logger } from '../../../utils/logger';
import type { TagRepository } from './TagRepository';
import { toTag, toTagRowBoolean } from './tagMapper';
import type {
  CreateTagInput,
  Tag,
  TagListFilter,
  UpdateTagInput,
} from './types';

type CountRow = {
  count: number;
};

type AudioItemIdRow = {
  audio_item_id: string;
};

type IdRow = {
  id: string;
};

type UpdateField = {
  column: string;
  value: SqlValue;
};

const TAG_SELECT = `
  SELECT
    id,
    name,
    color,
    is_favorite,
    is_pinned,
    created_at,
    updated_at
  FROM tags
`;

export class SqliteTagRepository implements TagRepository {
  constructor(private readonly db: DatabaseConnection = getDatabase()) {}

  async create(input: CreateTagInput): Promise<Tag> {
    return this.withDatabaseError('create', async () => {
      const name = this.normalizeName(input.name);
      const existing = await this.getRowByName(name);

      if (existing) {
        throw new AppError('DATABASE_ERROR', 'Tag name already exists.', {
          context: { name },
        });
      }

      return this.insertTag({
        ...input,
        name,
      });
    });
  }

  async getById(id: string): Promise<Tag | null> {
    return this.withDatabaseError('getById', async () => {
      const row = await this.getRowById(id);
      return row ? toTag(row) : null;
    });
  }

  async getByName(name: string): Promise<Tag | null> {
    return this.withDatabaseError('getByName', async () => {
      const row = await this.getRowByName(this.normalizeName(name));
      return row ? toTag(row) : null;
    });
  }

  async list(filter: TagListFilter = {}): Promise<Tag[]> {
    return this.withDatabaseError('list', async () => {
      const where: string[] = [];
      const params: SqlParams = [];

      const searchQuery = filter.searchQuery?.trim();

      if (searchQuery) {
        where.push('name LIKE ?');
        params.push(`%${searchQuery}%`);
      }

      if (filter.isFavorite !== undefined) {
        where.push('is_favorite = ?');
        params.push(toTagRowBoolean(filter.isFavorite));
      }

      if (filter.isPinned !== undefined) {
        where.push('is_pinned = ?');
        params.push(toTagRowBoolean(filter.isPinned));
      }

      const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
      const limitSql = this.createLimitSql(filter, params);
      const result = await this.db.query<TagRow>(
        `
          ${TAG_SELECT}
          ${whereSql}
          ORDER BY name COLLATE NOCASE ASC
          ${limitSql}
        `,
        params,
      );

      return result.rows.map(toTag);
    });
  }

  async update(id: string, input: UpdateTagInput): Promise<Tag> {
    return this.withDatabaseError('update', async () => {
      const fields = await this.createUpdateFields(id, input);
      fields.push({ column: 'updated_at', value: nowIso() });

      await this.executeUpdate(id, fields);

      return this.requireById(id, 'Tag was not found after update.');
    });
  }

  async delete(id: string): Promise<void> {
    await this.withDatabaseError('delete', async () => {
      await this.db.execute('DELETE FROM tags WHERE id = ?', [id]);
    });
  }

  async count(): Promise<number> {
    return this.withDatabaseError('count', async () => {
      const result = await this.db.query<CountRow>(
        'SELECT COUNT(*) as count FROM tags',
      );

      return result.rows[0]?.count ?? 0;
    });
  }

  async assignTagToAudioItem(
    audioItemId: string,
    tagId: string,
  ): Promise<void> {
    await this.withDatabaseError('assignTagToAudioItem', async () => {
      await this.db.execute(
        `
          INSERT OR IGNORE INTO audio_item_tags (audio_item_id, tag_id)
          VALUES (?, ?)
        `,
        [audioItemId, tagId],
      );
    });
  }

  async removeTagFromAudioItem(
    audioItemId: string,
    tagId: string,
  ): Promise<void> {
    await this.withDatabaseError('removeTagFromAudioItem', async () => {
      await this.db.execute(
        `
          DELETE FROM audio_item_tags
          WHERE audio_item_id = ? AND tag_id = ?
        `,
        [audioItemId, tagId],
      );
    });
  }

  async setTagsForAudioItem(
    audioItemId: string,
    tagIds: string[],
  ): Promise<void> {
    await this.withDatabaseError('setTagsForAudioItem', async () => {
      const uniqueTagIds = Array.from(new Set(tagIds));

      await this.db.transaction(async transactionDb => {
        await this.ensureAudioItemExists(audioItemId, transactionDb);
        await transactionDb.execute(
          'DELETE FROM audio_item_tags WHERE audio_item_id = ?',
          [audioItemId],
        );

        for (const tagId of uniqueTagIds) {
          await transactionDb.execute(
            `
              INSERT OR IGNORE INTO audio_item_tags (audio_item_id, tag_id)
              VALUES (?, ?)
            `,
            [audioItemId, tagId],
          );
        }
      });
    });
  }

  async getTagsForAudioItem(audioItemId: string): Promise<Tag[]> {
    return this.withDatabaseError('getTagsForAudioItem', async () => {
      const result = await this.db.query<TagRow>(
        `
          SELECT
            tags.id,
            tags.name,
            tags.color,
            tags.is_favorite,
            tags.is_pinned,
            tags.created_at,
            tags.updated_at
          FROM tags
          INNER JOIN audio_item_tags
            ON tags.id = audio_item_tags.tag_id
          WHERE audio_item_tags.audio_item_id = ?
          ORDER BY tags.name COLLATE NOCASE ASC
        `,
        [audioItemId],
      );

      return result.rows.map(toTag);
    });
  }

  async getAudioItemIdsForTag(tagId: string): Promise<string[]> {
    return this.withDatabaseError('getAudioItemIdsForTag', async () => {
      const result = await this.db.query<AudioItemIdRow>(
        `
          SELECT audio_item_id
          FROM audio_item_tags
          WHERE tag_id = ?
          ORDER BY audio_item_id ASC
        `,
        [tagId],
      );

      return result.rows.map(row => row.audio_item_id);
    });
  }

  async findOrCreateByName(name: string): Promise<Tag> {
    return this.withDatabaseError('findOrCreateByName', async () => {
      const normalizedName = this.normalizeName(name);
      const existing = await this.getRowByName(normalizedName);

      if (existing) {
        return toTag(existing);
      }

      try {
        return await this.insertTag({ name: normalizedName });
      } catch (error) {
        const rowAfterError = await this.getRowByName(normalizedName);

        if (rowAfterError) {
          return toTag(rowAfterError);
        }

        throw error;
      }
    });
  }

  private async insertTag(input: CreateTagInput): Promise<Tag> {
    const id = createId('tag');
    const timestamp = nowIso();

    try {
      await this.db.execute(
        `
          INSERT INTO tags (
            id,
            name,
            color,
            is_favorite,
            is_pinned,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          input.name,
          input.color ?? null,
          toTagRowBoolean(input.isFavorite ?? false),
          toTagRowBoolean(input.isPinned ?? false),
          timestamp,
          timestamp,
        ],
      );
    } catch (error) {
      if (this.isConstraintError(error)) {
        throw new AppError('DATABASE_ERROR', 'Tag name already exists.', {
          cause: error,
          context: { name: input.name },
        });
      }

      throw error;
    }

    return this.requireById(id, 'Created tag was not found.');
  }

  private async getRowById(id: string): Promise<TagRow | null> {
    const result = await this.db.query<TagRow>(
      `
        ${TAG_SELECT}
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  private async getRowByName(name: string): Promise<TagRow | null> {
    const result = await this.db.query<TagRow>(
      `
        ${TAG_SELECT}
        WHERE LOWER(name) = LOWER(?)
        LIMIT 1
      `,
      [name],
    );

    return result.rows[0] ?? null;
  }

  private async requireById(id: string, message: string): Promise<Tag> {
    const row = await this.getRowById(id);

    if (!row) {
      throw new AppError('DATABASE_ERROR', message, { context: { id } });
    }

    return toTag(row);
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

  private async createUpdateFields(
    id: string,
    input: UpdateTagInput,
  ): Promise<UpdateField[]> {
    const fields: UpdateField[] = [];

    if (input.name !== undefined) {
      const name = this.normalizeName(input.name);
      const existing = await this.getRowByName(name);

      if (existing && existing.id !== id) {
        throw new AppError('DATABASE_ERROR', 'Tag name already exists.', {
          context: { name },
        });
      }

      fields.push({ column: 'name', value: name });
    }

    if (input.color !== undefined) {
      fields.push({ column: 'color', value: input.color });
    }

    if (input.isFavorite !== undefined) {
      fields.push({
        column: 'is_favorite',
        value: toTagRowBoolean(input.isFavorite),
      });
    }

    if (input.isPinned !== undefined) {
      fields.push({
        column: 'is_pinned',
        value: toTagRowBoolean(input.isPinned),
      });
    }

    return fields;
  }

  private async executeUpdate(
    id: string,
    fields: UpdateField[],
  ): Promise<void> {
    const assignments = fields.map(field => `${field.column} = ?`).join(', ');
    const params: SqlParams = [...fields.map(field => field.value), id];

    try {
      await this.db.execute(
        `
          UPDATE tags
          SET ${assignments}
          WHERE id = ?
        `,
        params,
      );
    } catch (error) {
      if (this.isConstraintError(error)) {
        throw new AppError('DATABASE_ERROR', 'Tag name already exists.', {
          cause: error,
          context: { id },
        });
      }

      throw error;
    }
  }

  private createLimitSql(filter: TagListFilter, params: SqlParams): string {
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
        `Tag ${fieldName} must be a non-negative integer.`,
        { context: { [fieldName]: value } },
      );
    }
  }

  private normalizeName(name: string): string {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new AppError('DATABASE_ERROR', 'Tag name must not be empty.');
    }

    return normalizedName;
  }

  private isConstraintError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const normalizedMessage = message.toLowerCase();

    return (
      normalizedMessage.includes('constraint') ||
      normalizedMessage.includes('unique')
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
              `Tag repository ${operation} failed.`,
              { cause: error },
            );

      logger.error('Tag repository operation failed', {
        operation,
        code: appError.code,
        errorMessage: appError.message,
      });

      throw appError;
    }
  }
}
