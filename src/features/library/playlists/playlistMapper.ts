import type {
  PlaylistItemRow,
  PlaylistRow,
  SqliteBoolean,
} from '../../../storage/database/schema';
import type { Playlist, PlaylistItem } from './types';

export function toPlaylistRowBoolean(value: boolean): SqliteBoolean {
  return value ? 1 : 0;
}

export function toPlaylist(row: PlaylistRow): Playlist {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    coverPath: row.cover_path,
    isFavorite: row.is_favorite === 1,
    isPinned: row.is_pinned === 1,
    currentAudioItemId: row.current_audio_item_id,
    currentPositionMs: row.current_position_ms,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastPlayedAt: row.last_played_at,
  };
}

export function toPlaylistItem(row: PlaylistItemRow): PlaylistItem {
  return {
    id: row.id,
    playlistId: row.playlist_id,
    audioItemId: row.audio_item_id,
    position: row.position,
    createdAt: row.created_at,
  };
}
