export type ImportInferredMediaType = 'music' | 'podcast' | 'audiobook';
export type ImportCandidateStatus =
  | 'selected'
  | 'unsupported'
  | 'copying'
  | 'copied'
  | 'copy_error'
  | 'error';
export type ImportSessionStatus =
  | 'selected'
  | 'copying'
  | 'ready'
  | 'error'
  | 'cleared';

export interface ImportCandidate {
  id: string;
  sourceUri: string;
  name: string;
  size: number | null;
  mimeType: string | null;
  extension: string | null;
  inferredMediaType: ImportInferredMediaType;
  status: ImportCandidateStatus;
  errorMessage: string | null;
  selectedAt: string;
  tempLocalUri: string | null;
  tempFileName: string | null;
  copyErrorMessage: string | null;
  copiedAt: string | null;
}

export interface ImportSession {
  id: string;
  candidates: ImportCandidate[];
  createdAt: string;
  updatedAt: string;
  tempDirectory: string | null;
  status: ImportSessionStatus;
  errorMessage: string | null;
}

export interface PickAudioFilesResult {
  session: ImportSession;
  acceptedCount: number;
  rejectedCount: number;
}

export interface CopyImportSessionResult {
  session: ImportSession;
  copiedCount: number;
  failedCount: number;
  skippedCount: number;
}

export const SUPPORTED_AUDIO_EXTENSIONS = [
  'mp3',
  'm4a',
  'aac',
  'wav',
  'flac',
  'ogg',
  'opus',
] as const;

export const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/ogg',
  'audio/opus',
] as const;

export type SupportedAudioExtension =
  (typeof SUPPORTED_AUDIO_EXTENSIONS)[number];
export type SupportedAudioMimeType =
  (typeof SUPPORTED_AUDIO_MIME_TYPES)[number];
