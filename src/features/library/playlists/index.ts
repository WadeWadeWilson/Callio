import { getDatabase } from '../../../storage/database/database';
import type { PlaylistRepository } from './PlaylistRepository';
import { SqlitePlaylistRepository } from './SqlitePlaylistRepository';

export type { PlaylistRepository } from './PlaylistRepository';
export { SqlitePlaylistRepository } from './SqlitePlaylistRepository';
export type {
  CreatePlaylistInput,
  Playlist,
  PlaylistItem,
  PlaylistListFilter,
  PlaylistWithItems,
  UpdatePlaylistInput,
} from './types';

export function createPlaylistRepository(): PlaylistRepository {
  return new SqlitePlaylistRepository(getDatabase());
}
