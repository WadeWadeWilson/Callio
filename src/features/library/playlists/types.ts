export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  coverPath: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  currentAudioItemId: string | null;
  currentPositionMs: number;
  createdAt: string;
  updatedAt: string;
  lastPlayedAt: string | null;
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  audioItemId: string;
  position: number;
  createdAt: string;
}

export interface PlaylistWithItems {
  playlist: Playlist;
  items: PlaylistItem[];
}

export interface CreatePlaylistInput {
  name: string;
  description?: string | null;
  coverPath?: string | null;
  isFavorite?: boolean;
  isPinned?: boolean;
}

export interface UpdatePlaylistInput {
  name?: string;
  description?: string | null;
  coverPath?: string | null;
  isFavorite?: boolean;
  isPinned?: boolean;
  currentAudioItemId?: string | null;
  currentPositionMs?: number;
  lastPlayedAt?: string | null;
}

export interface PlaylistListFilter {
  searchQuery?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  limit?: number;
  offset?: number;
}
