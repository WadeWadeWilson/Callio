import { AppError } from '../../../utils/errors';
import { logger } from '../../../utils/logger';
import { createAudioItemRepository } from './index';

const DEBUG_AUDIO_FILE_PATH = 'debug/audio/debug-track.mp3';
const DEBUG_AUDIO_TITLE = 'Debug Track';

export async function runAudioItemRepositorySmokeTest(): Promise<void> {
  const repository = createAudioItemRepository();
  let createdId: string | undefined;

  try {
    const existingDebugItems = await repository.list({
      searchQuery: DEBUG_AUDIO_TITLE,
      limit: 25,
    });

    for (const item of existingDebugItems) {
      if (
        item.title === DEBUG_AUDIO_TITLE &&
        item.creator === 'Callio' &&
        item.filePath === DEBUG_AUDIO_FILE_PATH
      ) {
        await repository.delete(item.id);
      }
    }

    const created = await repository.create({
      title: DEBUG_AUDIO_TITLE,
      creator: 'Callio',
      mediaType: 'music',
      filePath: DEBUG_AUDIO_FILE_PATH,
      durationMs: 180000,
      originalFilename: 'debug-track.mp3',
    });
    createdId = created.id;

    const loaded = await repository.getById(created.id);

    if (!loaded) {
      throw new AppError(
        'DATABASE_ERROR',
        'Audio item smoke test could not load created item.',
      );
    }

    await repository.updateProgress(created.id, 30000);
    await repository.setFavorite(created.id, true);

    const searchResults = await repository.list({
      searchQuery: 'Debug',
      limit: 10,
    });

    if (!searchResults.some(item => item.id === created.id)) {
      throw new AppError(
        'DATABASE_ERROR',
        'Audio item smoke test search did not return created item.',
      );
    }

    const totalCount = await repository.count();
    await repository.delete(created.id);
    createdId = undefined;

    logger.info('Audio item repository smoke test passed', {
      count: totalCount,
    });
  } catch (error) {
    if (createdId) {
      try {
        await repository.delete(createdId);
      } catch (cleanupError) {
        logger.warn('Audio item smoke test cleanup failed', {
          errorMessage:
            cleanupError instanceof Error
              ? cleanupError.message
              : String(cleanupError),
        });
      }
    }

    const appError =
      error instanceof AppError
        ? error
        : new AppError(
            'DATABASE_ERROR',
            'Audio item repository smoke test failed.',
            { cause: error },
          );

    logger.error('Audio item repository smoke test failed', {
      code: appError.code,
      errorMessage: appError.message,
    });

    throw appError;
  }
}
