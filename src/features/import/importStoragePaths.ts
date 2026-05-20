import type { ImportCandidate } from './types';

const FALLBACK_EXTENSION = 'audio';

export function getImportTempDirectory(sessionId: string): string {
  return `cachesDirectory/temp/import-session-${sanitizePathSegment(
    sessionId,
  )}`;
}

export function createTempFileName(candidate: ImportCandidate): string {
  const baseName = removeExtension(candidate.name) || candidate.id;
  const safeName = sanitizePathSegment(baseName);
  const extension = sanitizeExtension(candidate.extension);

  return `${candidate.id}-${safeName}.${extension}`;
}

function removeExtension(value: string): string {
  const trimmedValue = value.trim();
  const lastDotIndex = trimmedValue.lastIndexOf('.');

  if (lastDotIndex <= 0) {
    return trimmedValue;
  }

  return trimmedValue.slice(0, lastDotIndex);
}

function sanitizeExtension(value: string | null): string {
  const sanitized = value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return sanitized || FALLBACK_EXTENSION;
}

function sanitizePathSegment(value: string): string {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return sanitized || 'file';
}
