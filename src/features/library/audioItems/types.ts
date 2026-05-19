import type { MediaType } from '../../../storage/database/schema';

export type { MediaType };

export interface AudioItem {
  id: string;
  title: string;
  creator: string | null;
  mediaType: MediaType;
  filePath: string;
  coverPath: string | null;
  durationMs: number;
  progressMs: number;
  playCount: number;
  isFavorite: boolean;
  isPinned: boolean;
  fileHash: string | null;
  originalFilename: string | null;
  addedAt: string;
  updatedAt: string;
  lastPlayedAt: string | null;
  completedAt: string | null;
}

export interface CreateAudioItemInput {
  title: string;
  creator?: string | null;
  mediaType: MediaType;
  filePath: string;
  coverPath?: string | null;
  durationMs?: number;
  fileHash?: string | null;
  originalFilename?: string | null;
}

export interface UpdateAudioItemInput {
  title?: string;
  creator?: string | null;
  mediaType?: MediaType;
  coverPath?: string | null;
  durationMs?: number;
  progressMs?: number;
  playCount?: number;
  isFavorite?: boolean;
  isPinned?: boolean;
  lastPlayedAt?: string | null;
  completedAt?: string | null;
}

export interface AudioItemListFilter {
  mediaType?: MediaType;
  isFavorite?: boolean;
  isPinned?: boolean;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}
