import type { CreatorTitleInference } from './types';

const FALLBACK_TITLE = 'Unbenannter Titel';
const TRAILING_NOISE_PATTERN =
  /\s*(?:\((?:official audio|official video|lyrics)\)|\[(?:official audio|official video|lyrics)\])\s*$/i;

export function getExtensionFromName(
  name: string | null | undefined,
): string | null {
  const normalizedName = normalizeNameInput(name);

  if (!normalizedName) {
    return null;
  }

  const lastSegment = getLastPathSegment(normalizedName);
  const lastDotIndex = lastSegment.lastIndexOf('.');

  if (lastDotIndex <= 0 || lastDotIndex === lastSegment.length - 1) {
    return null;
  }

  const extension = lastSegment
    .slice(lastDotIndex + 1)
    .trim()
    .toLowerCase();
  return extension || null;
}

export function removeExtension(name: string): string {
  const normalizedName = stripQueryAndHash(name);
  const lastDotIndex = normalizedName.lastIndexOf('.');
  const lastSlashIndex = Math.max(
    normalizedName.lastIndexOf('/'),
    normalizedName.lastIndexOf('\\'),
  );

  if (lastDotIndex <= lastSlashIndex + 1) {
    return normalizedName;
  }

  return normalizedName.slice(0, lastDotIndex);
}

export function cleanAudioTitle(rawName: string): string {
  let cleanedName = removeExtension(rawName)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+-\s+/g, ' - ')
    .trim();

  cleanedName = cleanedName
    .replace(/^\d{1,3}\s*-\s*/, '')
    .replace(/^\d{1,3}\.\s*/, '')
    .replace(/^\d{1,3}\s+/, '')
    .trim();

  while (TRAILING_NOISE_PATTERN.test(cleanedName)) {
    cleanedName = cleanedName.replace(TRAILING_NOISE_PATTERN, '').trim();
  }

  cleanedName = cleanedName.replace(/\s+/g, ' ').trim();
  return cleanedName || FALLBACK_TITLE;
}

export function inferCreatorAndTitle(
  cleanedName: string,
): CreatorTitleInference {
  const normalizedName = cleanedName.trim() || FALLBACK_TITLE;
  const separator = ' - ';
  const separatorIndex = normalizedName.indexOf(separator);

  if (separatorIndex === -1) {
    return {
      creator: null,
      title: normalizedName,
    };
  }

  const creator = normalizedName.slice(0, separatorIndex).trim();
  const title = normalizedName.slice(separatorIndex + separator.length).trim();

  if (!creator || !title) {
    return {
      creator: null,
      title: normalizedName,
    };
  }

  return {
    creator,
    title,
  };
}

function normalizeNameInput(name: string | null | undefined): string | null {
  const normalizedName = name?.trim();
  return normalizedName || null;
}

function getLastPathSegment(value: string): string {
  const cleanValue = stripQueryAndHash(value);
  return cleanValue.split(/[\\/]/).filter(Boolean).pop() ?? cleanValue;
}

function stripQueryAndHash(value: string): string {
  return value.split('?')[0]?.split('#')[0] ?? value;
}
