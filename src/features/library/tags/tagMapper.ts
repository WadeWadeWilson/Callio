import type { SqliteBoolean, TagRow } from '../../../storage/database/schema';
import type { Tag } from './types';

export function toTagRowBoolean(value: boolean): SqliteBoolean {
  return value ? 1 : 0;
}

export function toTag(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    isFavorite: row.is_favorite === 1,
    isPinned: row.is_pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
