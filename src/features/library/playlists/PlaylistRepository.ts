import type {
  CreatePlaylistInput,
  Playlist,
  PlaylistItem,
  PlaylistListFilter,
  PlaylistWithItems,
  UpdatePlaylistInput,
} from './types';

export interface PlaylistRepository {
  create(input: CreatePlaylistInput): Promise<Playlist>;
  getById(id: string): Promise<Playlist | null>;
  getWithItems(id: string): Promise<PlaylistWithItems | null>;
  list(filter?: PlaylistListFilter): Promise<Playlist[]>;
  update(id: string, input: UpdatePlaylistInput): Promise<Playlist>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
  addItem(
    playlistId: string,
    audioItemId: string,
    position?: number,
  ): Promise<PlaylistItem>;
  removeItem(playlistItemId: string): Promise<void>;
  removeAudioItemFromPlaylist(
    playlistId: string,
    audioItemId: string,
  ): Promise<void>;
  listItems(playlistId: string): Promise<PlaylistItem[]>;
  reorderItems(
    playlistId: string,
    orderedPlaylistItemIds: string[],
  ): Promise<void>;
  clearItems(playlistId: string): Promise<void>;
  updateResumeState(
    playlistId: string,
    currentAudioItemId: string | null,
    currentPositionMs: number,
  ): Promise<void>;
}
