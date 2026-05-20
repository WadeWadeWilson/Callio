import { keepLocalCopy } from '@react-native-documents/picker';

import { nowIso } from '../../storage/database/sql';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import {
  createTempFileName,
  getImportTempDirectory,
} from './importStoragePaths';
import type {
  CopyImportSessionResult,
  ImportCandidate,
  ImportSession,
} from './types';

export interface ImportTempStorageService {
  copySessionToTemp(session: ImportSession): Promise<CopyImportSessionResult>;
  clearTempSession(session: ImportSession): Promise<void>;
}

type LocalCopyResultBySourceUri = Map<
  string,
  | { copyError: string; status: 'error' }
  | { localUri: string; status: 'success' }
>;

export class DocumentsImportTempStorageService
  implements ImportTempStorageService
{
  async copySessionToTemp(
    session: ImportSession,
  ): Promise<CopyImportSessionResult> {
    const selectedCandidates = session.candidates.filter(
      candidate => candidate.status === 'selected',
    );
    const skippedCount = session.candidates.length - selectedCandidates.length;
    const copyingTimestamp = nowIso();
    const copyingSession = this.createCopyingSession(session, copyingTimestamp);

    if (selectedCandidates.length === 0) {
      return {
        session: {
          ...copyingSession,
          status: 'error',
          errorMessage: 'Keine unterstuetzten Dateien zum Kopieren vorhanden.',
          updatedAt: nowIso(),
        },
        copiedCount: 0,
        failedCount: 0,
        skippedCount,
      };
    }

    try {
      const filesToCopy = selectedCandidates.map(candidate => ({
        uri: candidate.sourceUri,
        fileName: createTempFileName(candidate),
      }));
      const [firstFileToCopy, ...remainingFilesToCopy] = filesToCopy;

      if (!firstFileToCopy) {
        throw new AppError(
          'FILE_COPY_ERROR',
          'Keine unterstuetzten Dateien zum Kopieren vorhanden.',
          {
            context: { sessionId: session.id },
          },
        );
      }

      const copyResults = await keepLocalCopy({
        destination: 'cachesDirectory',
        files: [firstFileToCopy, ...remainingFilesToCopy],
      });
      const resultBySourceUri: LocalCopyResultBySourceUri = new Map(
        copyResults.map(result => [result.sourceUri, result]),
      );
      const copiedAt = nowIso();
      const copiedCandidates = copyingSession.candidates.map(candidate =>
        this.applyCopyResult(candidate, resultBySourceUri, copiedAt),
      );
      const copiedCount = copiedCandidates.filter(
        candidate => candidate.status === 'copied',
      ).length;
      const failedCount = copiedCandidates.filter(
        candidate => candidate.status === 'copy_error',
      ).length;
      const sessionStatus = copiedCount > 0 ? 'ready' : 'error';
      const tempDirectory =
        inferCommonDirectory(copiedCandidates) ??
        getImportTempDirectory(session.id);
      const updatedSession: ImportSession = {
        ...copyingSession,
        candidates: copiedCandidates,
        tempDirectory,
        status: sessionStatus,
        errorMessage:
          sessionStatus === 'error'
            ? 'Keine Datei konnte temporaer vorbereitet werden.'
            : null,
        updatedAt: copiedAt,
      };

      logger.info('Import session copied to temporary storage', {
        copiedCount,
        failedCount,
        skippedCount,
        sessionId: session.id,
      });

      return {
        session: updatedSession,
        copiedCount,
        failedCount,
        skippedCount,
      };
    } catch (error) {
      logger.error('Import session copy failed', {
        errorMessage: error instanceof Error ? error.message : String(error),
        sessionId: session.id,
      });

      throw new AppError(
        'FILE_COPY_ERROR',
        'Die Dateien konnten nicht temporaer vorbereitet werden.',
        {
          cause: error,
          context: { sessionId: session.id },
        },
      );
    }
  }

  async clearTempSession(session: ImportSession): Promise<void> {
    const copiedCount = session.candidates.filter(
      candidate => candidate.tempLocalUri,
    ).length;

    if (copiedCount > 0) {
      logger.warn('Temporary import files cannot be deleted directly yet', {
        copiedCount,
        sessionId: session.id,
        tempDirectory: session.tempDirectory,
      });
    }

    session.status = 'cleared';
    session.errorMessage = null;
    session.updatedAt = nowIso();
  }

  private createCopyingSession(
    session: ImportSession,
    timestamp: string,
  ): ImportSession {
    return {
      ...session,
      tempDirectory:
        session.tempDirectory ?? getImportTempDirectory(session.id),
      status: 'copying',
      errorMessage: null,
      updatedAt: timestamp,
      candidates: session.candidates.map(candidate =>
        candidate.status === 'selected'
          ? {
              ...candidate,
              status: 'copying',
              copyErrorMessage: null,
            }
          : candidate,
      ),
    };
  }

  private applyCopyResult(
    candidate: ImportCandidate,
    resultBySourceUri: LocalCopyResultBySourceUri,
    copiedAt: string,
  ): ImportCandidate {
    if (candidate.status !== 'copying') {
      return candidate;
    }

    const result = resultBySourceUri.get(candidate.sourceUri);
    const tempFileName = createTempFileName(candidate);

    if (!result) {
      return {
        ...candidate,
        status: 'copy_error',
        tempFileName,
        copyErrorMessage: 'Keine Kopierantwort fuer diese Datei erhalten.',
      };
    }

    if (result.status === 'error') {
      return {
        ...candidate,
        status: 'copy_error',
        tempFileName,
        copyErrorMessage: result.copyError,
      };
    }

    return {
      ...candidate,
      status: 'copied',
      tempLocalUri: result.localUri,
      tempFileName,
      copyErrorMessage: null,
      copiedAt,
    };
  }
}

export function createImportTempStorageService(): ImportTempStorageService {
  return new DocumentsImportTempStorageService();
}

function inferCommonDirectory(candidates: ImportCandidate[]): string | null {
  const copiedUris = candidates
    .map(candidate => candidate.tempLocalUri)
    .filter((uri): uri is string => Boolean(uri));

  if (copiedUris.length === 0) {
    return null;
  }

  const directories = copiedUris.map(uri => uri.slice(0, uri.lastIndexOf('/')));
  const firstDirectory = directories[0];

  if (directories.every(directory => directory === firstDirectory)) {
    return firstDirectory;
  }

  return null;
}
