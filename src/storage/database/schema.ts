export type MediaType = 'music' | 'podcast' | 'audiobook';
export type PlaybackSourceType =
  | 'single'
  | 'playlist'
  | 'tag'
  | 'search'
  | 'favorites'
  | 'recent';

export type SqliteBoolean = 0 | 1;
export type IsoDateString = string;

export interface AudioItemRow {
  id: string;
  title: string;
  creator: string | null;
  media_type: MediaType;
  file_path: string;
  cover_path: string | null;
  duration_ms: number;
  progress_ms: number;
  play_count: number;
  is_favorite: SqliteBoolean;
  is_pinned: SqliteBoolean;
  file_hash: string | null;
  original_filename: string | null;
  added_at: IsoDateString;
  updated_at: IsoDateString;
  last_played_at: IsoDateString | null;
  completed_at: IsoDateString | null;
}

export interface TagRow {
  id: string;
  name: string;
  color: string | null;
  is_favorite: SqliteBoolean;
  is_pinned: SqliteBoolean;
  created_at: IsoDateString;
  updated_at: IsoDateString;
}

export interface AudioItemTagRow {
  audio_item_id: string;
  tag_id: string;
}

export interface PlaylistRow {
  id: string;
  name: string;
  description: string | null;
  cover_path: string | null;
  is_favorite: SqliteBoolean;
  is_pinned: SqliteBoolean;
  current_audio_item_id: string | null;
  current_position_ms: number;
  created_at: IsoDateString;
  updated_at: IsoDateString;
  last_played_at: IsoDateString | null;
}

export interface PlaylistItemRow {
  id: string;
  playlist_id: string;
  audio_item_id: string;
  position: number;
  created_at: IsoDateString;
}

export interface PlaybackSessionRow {
  id: string;
  source_type: PlaybackSourceType;
  source_id: string | null;
  current_audio_item_id: string | null;
  queue_json: string;
  queue_index: number;
  created_at: IsoDateString;
  updated_at: IsoDateString;
}

export interface AppSettingRow {
  key: string;
  value: string;
  updated_at: IsoDateString;
}
