import { getDatabase } from '../../../storage/database/database';
import type { AudioItemRepository } from './AudioItemRepository';
import { SqliteAudioItemRepository } from './SqliteAudioItemRepository';

export type { AudioItemRepository } from './AudioItemRepository';
export { SqliteAudioItemRepository } from './SqliteAudioItemRepository';
export type {
  AudioItem,
  AudioItemListFilter,
  CreateAudioItemInput,
  MediaType,
  UpdateAudioItemInput,
} from './types';

export function createAudioItemRepository(): AudioItemRepository {
  return new SqliteAudioItemRepository(getDatabase());
}
