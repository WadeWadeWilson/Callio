import type {
  AudioItemRow,
  SqliteBoolean,
} from '../../../storage/database/schema';
import type { AudioItem } from './types';

export function toAudioItemRowBooleans(value: boolean): SqliteBoolean {
  return value ? 1 : 0;
}

export function toAudioItem(row: AudioItemRow): AudioItem {
  return {
    id: row.id,
    title: row.title,
    creator: row.creator,
    mediaType: row.media_type,
    filePath: row.file_path,
    coverPath: row.cover_path,
    durationMs: row.duration_ms,
    progressMs: row.progress_ms,
    playCount: row.play_count,
    isFavorite: row.is_favorite === 1,
    isPinned: row.is_pinned === 1,
    fileHash: row.file_hash,
    originalFilename: row.original_filename,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
    lastPlayedAt: row.last_played_at,
    completedAt: row.completed_at,
  };
}
