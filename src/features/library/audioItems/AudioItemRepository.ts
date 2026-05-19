import type {
  AudioItem,
  AudioItemListFilter,
  CreateAudioItemInput,
  UpdateAudioItemInput,
} from './types';

export interface AudioItemRepository {
  create(input: CreateAudioItemInput): Promise<AudioItem>;
  getById(id: string): Promise<AudioItem | null>;
  list(filter?: AudioItemListFilter): Promise<AudioItem[]>;
  update(id: string, input: UpdateAudioItemInput): Promise<AudioItem>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
  updateProgress(id: string, progressMs: number): Promise<void>;
  markPlayed(id: string, progressMs: number): Promise<void>;
  setFavorite(id: string, isFavorite: boolean): Promise<void>;
  setPinned(id: string, isPinned: boolean): Promise<void>;
}
