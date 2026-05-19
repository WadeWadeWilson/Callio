import { getDatabase } from '../../../storage/database/database';
import type { TagRepository } from './TagRepository';
import { SqliteTagRepository } from './SqliteTagRepository';

export type { TagRepository } from './TagRepository';
export { SqliteTagRepository } from './SqliteTagRepository';
export type {
  CreateTagInput,
  Tag,
  TagListFilter,
  UpdateTagInput,
} from './types';

export function createTagRepository(): TagRepository {
  return new SqliteTagRepository(getDatabase());
}
