import { nowIso } from '../../storage/database/sql';
import { createId } from '../../utils/id';
import {
  SUPPORTED_AUDIO_EXTENSIONS,
  SUPPORTED_AUDIO_MIME_TYPES,
  type ImportCandidate,
  type ImportCandidateStatus,
  type ImportSession,
  type PickAudioFilesResult,
} from './types';

const supportedExtensions = new Set<string>(SUPPORTED_AUDIO_EXTENSIONS);
const supportedMimeTypes = new Set<string>(SUPPORTED_AUDIO_MIME_TYPES);

export interface PickedImportFile {
  error: string | null;
  hasRequestedType: boolean;
  name: string | null;
  nativeType: string | null;
  size: number | null;
  type: string | null;
  uri: string;
}

export function mapPickerResultsToPickAudioFilesResult(
  pickerResults: PickedImportFile[],
): PickAudioFilesResult {
  const timestamp = nowIso();
  const candidates = pickerResults.map(result =>
    mapPickerResultToImportCandidate(result, timestamp),
  );
  const session: ImportSession = {
    id: createId('import_session'),
    candidates,
    createdAt: timestamp,
    updatedAt: timestamp,
    tempDirectory: null,
    status: 'selected',
    errorMessage: null,
  };

  return {
    session,
    acceptedCount: candidates.filter(
      candidate => candidate.status === 'selected',
    ).length,
    rejectedCount: candidates.filter(
      candidate => candidate.status !== 'selected',
    ).length,
  };
}

export function mapPickerResultToImportCandidate(
  pickerResult: PickedImportFile,
  selectedAt = nowIso(),
): ImportCandidate {
  const sourceUri = pickerResult.uri;
  const name = getDisplayName(pickerResult);
  const extension = extractExtension(name) ?? extractExtension(sourceUri);
  const mimeType = normalizeMimeType(
    pickerResult.type ?? pickerResult.nativeType,
  );
  const validation = validatePickerResult({
    extension,
    hasRequestedType: pickerResult.hasRequestedType,
    metadataError: pickerResult.error,
    mimeType,
    name,
    sourceUri,
  });

  return {
    id: createId('import_candidate'),
    sourceUri,
    name,
    size: pickerResult.size,
    mimeType,
    extension,
    inferredMediaType: 'music',
    status: validation.status,
    errorMessage: validation.errorMessage,
    selectedAt,
    tempLocalUri: null,
    tempFileName: null,
    copyErrorMessage: null,
    copiedAt: null,
    draftMetadata: null,
  };
}

type ValidationInput = {
  extension: string | null;
  hasRequestedType: boolean;
  metadataError: string | null;
  mimeType: string | null;
  name: string;
  sourceUri: string;
};

type ValidationResult = {
  errorMessage: string | null;
  status: ImportCandidateStatus;
};

function validatePickerResult(input: ValidationInput): ValidationResult {
  if (!input.sourceUri) {
    return {
      status: 'error',
      errorMessage: 'Die ausgewahlte Datei hat keine gueltige Quelle.',
    };
  }

  if (!input.name) {
    return {
      status: 'error',
      errorMessage: 'Der Dateiname konnte nicht gelesen werden.',
    };
  }

  if (input.metadataError) {
    return {
      status: 'error',
      errorMessage: input.metadataError,
    };
  }

  const hasSupportedExtension =
    input.extension !== null && supportedExtensions.has(input.extension);
  const hasSupportedMimeType =
    input.mimeType !== null && supportedMimeTypes.has(input.mimeType);

  if (hasSupportedExtension || hasSupportedMimeType) {
    return {
      status: 'selected',
      errorMessage: null,
    };
  }

  if (!input.hasRequestedType) {
    return {
      status: 'unsupported',
      errorMessage:
        'Der Android-Dateianbieter hat einen anderen Dateityp geliefert.',
    };
  }

  return {
    status: 'unsupported',
    errorMessage: 'Dieses Audioformat wird im MVP noch nicht unterstuetzt.',
  };
}

function getDisplayName(pickerResult: PickedImportFile): string {
  const trimmedName = pickerResult.name?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  return extractFilenameFromUri(pickerResult.uri) ?? '';
}

function extractFilenameFromUri(uri: string): string | null {
  const withoutQuery = uri.split('?')[0] ?? uri;
  const lastSegment = withoutQuery.split('/').filter(Boolean).pop();

  if (!lastSegment) {
    return null;
  }

  try {
    return decodeURIComponent(lastSegment);
  } catch {
    return lastSegment;
  }
}

function extractExtension(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const cleanValue = value.split('?')[0]?.split('#')[0] ?? value;
  const lastSegment = cleanValue.split('/').filter(Boolean).pop() ?? cleanValue;
  const extension = lastSegment.includes('.')
    ? lastSegment.split('.').pop()
    : null;

  return extension ? extension.trim().toLowerCase() : null;
}

function normalizeMimeType(value: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}
