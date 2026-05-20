export type ImportInferredMediaType = 'music' | 'podcast' | 'audiobook';
export type ImportCandidateStatus = 'selected' | 'unsupported' | 'error';

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
}

export interface ImportSession {
  id: string;
  candidates: ImportCandidate[];
  createdAt: string;
  updatedAt: string;
}

export interface PickAudioFilesResult {
  session: ImportSession;
  acceptedCount: number;
  rejectedCount: number;
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
