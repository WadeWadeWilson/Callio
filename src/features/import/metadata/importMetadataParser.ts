import { nowIso } from '../../../storage/database/sql';
import type {
  ImportCandidate,
  ImportDraftMetadata,
  ImportSession,
} from '../types';
import {
  cleanAudioTitle,
  getExtensionFromName,
  inferCreatorAndTitle,
} from './fileNameCleaner';

const draftableCandidateStatuses = new Set<ImportCandidate['status']>([
  'selected',
  'copied',
]);

export function parseDraftMetadataForCandidate(
  candidate: ImportCandidate,
): ImportDraftMetadata {
  if (candidate.draftMetadata) {
    return candidate.draftMetadata;
  }

  const cleanedName = cleanAudioTitle(candidate.name);
  const { creator, title } = inferCreatorAndTitle(cleanedName);

  return {
    title,
    creator,
    mediaType: candidate.inferredMediaType ?? 'music',
    extension: normalizeExtension(candidate.extension, candidate.name),
    mimeType: candidate.mimeType,
    durationMs: null,
    coverPath: null,
    tags: [],
    originalFilename: candidate.name || null,
  };
}

export function parseDraftMetadataForSession(
  session: ImportSession,
): ImportSession {
  return {
    ...session,
    updatedAt: nowIso(),
    candidates: session.candidates.map(candidate => {
      if (!draftableCandidateStatuses.has(candidate.status)) {
        return candidate;
      }

      return {
        ...candidate,
        draftMetadata: parseDraftMetadataForCandidate(candidate),
      };
    }),
  };
}

function normalizeExtension(
  extension: string | null,
  fallbackName: string,
): string | null {
  const normalizedExtension = extension?.trim().toLowerCase();
  return normalizedExtension || getExtensionFromName(fallbackName);
}
