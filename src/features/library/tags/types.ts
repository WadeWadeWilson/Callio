export interface Tag {
  id: string;
  name: string;
  color: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  name: string;
  color?: string | null;
  isFavorite?: boolean;
  isPinned?: boolean;
}

export interface UpdateTagInput {
  name?: string;
  color?: string | null;
  isFavorite?: boolean;
  isPinned?: boolean;
}

export interface TagListFilter {
  searchQuery?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  limit?: number;
  offset?: number;
}
