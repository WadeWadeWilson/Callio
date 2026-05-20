import { logger } from '../../utils/logger';
import { parseDraftMetadataForSession } from './metadata/importMetadataParser';
import type { ImportSession } from './types';

export interface ImportMetadataService {
  prepareDraftMetadata(session: ImportSession): Promise<ImportSession>;
}

export class LocalImportMetadataService implements ImportMetadataService {
  async prepareDraftMetadata(session: ImportSession): Promise<ImportSession> {
    const updatedSession = parseDraftMetadataForSession(session);
    const preparedCount = updatedSession.candidates.filter(
      candidate => candidate.draftMetadata !== null,
    ).length;

    logger.info('Import draft metadata prepared', {
      preparedCount,
      sessionId: session.id,
    });

    return updatedSession;
  }
}

export function createImportMetadataService(): ImportMetadataService {
  return new LocalImportMetadataService();
}
