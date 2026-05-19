import type {
  CreateTagInput,
  Tag,
  TagListFilter,
  UpdateTagInput,
} from './types';

export interface TagRepository {
  create(input: CreateTagInput): Promise<Tag>;
  getById(id: string): Promise<Tag | null>;
  getByName(name: string): Promise<Tag | null>;
  list(filter?: TagListFilter): Promise<Tag[]>;
  update(id: string, input: UpdateTagInput): Promise<Tag>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
  assignTagToAudioItem(audioItemId: string, tagId: string): Promise<void>;
  removeTagFromAudioItem(audioItemId: string, tagId: string): Promise<void>;
  setTagsForAudioItem(audioItemId: string, tagIds: string[]): Promise<void>;
  getTagsForAudioItem(audioItemId: string): Promise<Tag[]>;
  getAudioItemIdsForTag(tagId: string): Promise<string[]>;
  findOrCreateByName(name: string): Promise<Tag>;
}
