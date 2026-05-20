import {
  errorCodes,
  isErrorWithCode,
  pick,
  types,
} from '@react-native-documents/picker';

import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { mapPickerResultsToPickAudioFilesResult } from './importCandidateMapper';
import { SUPPORTED_AUDIO_MIME_TYPES, type PickAudioFilesResult } from './types';

export interface ImportPickerService {
  pickAudioFiles(): Promise<PickAudioFilesResult | null>;
}

export class DocumentImportPickerService implements ImportPickerService {
  async pickAudioFiles(): Promise<PickAudioFilesResult | null> {
    try {
      const pickerResults = await pick({
        allowMultiSelection: true,
        allowVirtualFiles: false,
        mode: 'import',
        type: [types.audio, ...SUPPORTED_AUDIO_MIME_TYPES],
      });

      return mapPickerResultsToPickAudioFilesResult([...pickerResults]);
    } catch (error) {
      if (
        isErrorWithCode(error) &&
        error.code === errorCodes.OPERATION_CANCELED
      ) {
        return null;
      }

      logger.error('Audio file picker failed', {
        errorCode: isErrorWithCode(error) ? error.code : 'unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw new AppError(
        'FILE_PICKER_ERROR',
        'Die Dateiauswahl konnte nicht geoeffnet werden.',
        {
          cause: error,
        },
      );
    }
  }
}

export function createImportPickerService(): ImportPickerService {
  return new DocumentImportPickerService();
}
