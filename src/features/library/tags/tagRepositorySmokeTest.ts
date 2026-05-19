import { createAudioItemRepository } from '../audioItems';
import { AppError } from '../../../utils/errors';
import { logger } from '../../../utils/logger';
import { createTagRepository } from './index';

const DEBUG_AUDIO_FILE_PATH = 'debug/audio/debug-tagged-track.mp3';
const DEBUG_AUDIO_TITLE = 'Debug Tagged Track';
const DEBUG_TAG_NAME = 'Debug';

export async function runTagRepositorySmokeTest(): Promise<void> {
  const audioItemRepository = createAudioItemRepository();
  const tagRepository = createTagRepository();
  const timestamp = Date.now();
  const updatedTagName = `Debug Updated ${timestamp}`;
  let createdAudioItemId: string | undefined;
  let assignedTagId: string | undefined;
  let disposableTagId: string | undefined;

  try {
    const staleDebugItems = await audioItemRepository.list({
      searchQuery: DEBUG_AUDIO_TITLE,
      limit: 25,
    });

    for (const item of staleDebugItems) {
      if (
        item.title === DEBUG_AUDIO_TITLE &&
        item.creator === 'Callio' &&
        item.filePath === DEBUG_AUDIO_FILE_PATH
      ) {
        await audioItemRepository.delete(item.id);
      }
    }

    const audioItem = await audioItemRepository.create({
      title: DEBUG_AUDIO_TITLE,
      creator: 'Callio',
      mediaType: 'music',
      filePath: DEBUG_AUDIO_FILE_PATH,
      durationMs: 60000,
    });
    createdAudioItemId = audioItem.id;

    const existingDebugTag = await tagRepository.getByName(DEBUG_TAG_NAME);
    const debugTag =
      existingDebugTag ??
      (await tagRepository.create({ name: DEBUG_TAG_NAME }));
    const ownsDebugTag = !existingDebugTag;
    assignedTagId = debugTag.id;

    const loadedDebugTag = await tagRepository.getById(debugTag.id);

    if (!loadedDebugTag) {
      throw new AppError(
        'DATABASE_ERROR',
        'Tag smoke test could not load the debug tag by ID.',
      );
    }

    await tagRepository.assignTagToAudioItem(audioItem.id, debugTag.id);
    await tagRepository.assignTagToAudioItem(audioItem.id, debugTag.id);
    await tagRepository.setTagsForAudioItem(audioItem.id, [
      debugTag.id,
      debugTag.id,
    ]);

    const tagsForAudioItem = await tagRepository.getTagsForAudioItem(
      audioItem.id,
    );

    if (!tagsForAudioItem.some(tag => tag.id === debugTag.id)) {
      throw new AppError(
        'DATABASE_ERROR',
        'Tag smoke test did not load the assigned tag.',
      );
    }

    const audioItemIdsForTag = await tagRepository.getAudioItemIdsForTag(
      debugTag.id,
    );

    if (!audioItemIdsForTag.includes(audioItem.id)) {
      throw new AppError(
        'DATABASE_ERROR',
        'Tag smoke test did not load the tagged audio item.',
      );
    }

    const tagForMutation = ownsDebugTag
      ? debugTag
      : await tagRepository.create({ name: `Debug Smoke ${timestamp}` });

    disposableTagId = tagForMutation.id;

    const updatedTag = await tagRepository.update(tagForMutation.id, {
      name: updatedTagName,
      isFavorite: true,
    });

    const searchResults = await tagRepository.list({
      searchQuery: 'Debug Updated',
      isFavorite: true,
      limit: 10,
    });

    if (
      updatedTag.name !== updatedTagName ||
      !searchResults.some(tag => tag.id === updatedTag.id)
    ) {
      throw new AppError(
        'DATABASE_ERROR',
        'Tag smoke test did not find the updated tag.',
      );
    }

    await tagRepository.removeTagFromAudioItem(audioItem.id, debugTag.id);
    await tagRepository.removeTagFromAudioItem(audioItem.id, debugTag.id);
    assignedTagId = undefined;

    await audioItemRepository.delete(audioItem.id);
    createdAudioItemId = undefined;

    await tagRepository.delete(disposableTagId);
    disposableTagId = undefined;

    const totalCount = await tagRepository.count();

    logger.info('Tag repository smoke test passed', {
      count: totalCount,
    });
  } catch (error) {
    if (assignedTagId && createdAudioItemId) {
      const audioItemIdToCleanUp = createdAudioItemId;
      const tagIdToCleanUp = assignedTagId;

      await runCleanupStep('remove debug tag assignment', () =>
        tagRepository.removeTagFromAudioItem(
          audioItemIdToCleanUp,
          tagIdToCleanUp,
        ),
      );
    }

    if (createdAudioItemId) {
      const audioItemIdToCleanUp = createdAudioItemId;

      await runCleanupStep('delete debug tagged audio item', () =>
        audioItemRepository.delete(audioItemIdToCleanUp),
      );
    }

    if (disposableTagId) {
      const tagIdToCleanUp = disposableTagId;

      await runCleanupStep('delete debug tag', () =>
        tagRepository.delete(tagIdToCleanUp),
      );
    }

    const appError =
      error instanceof AppError
        ? error
        : new AppError('DATABASE_ERROR', 'Tag repository smoke test failed.', {
            cause: error,
          });

    logger.error('Tag repository smoke test failed', {
      code: appError.code,
      errorMessage: appError.message,
    });

    throw appError;
  }
}

async function runCleanupStep(
  label: string,
  callback: () => Promise<void>,
): Promise<void> {
  try {
    await callback();
  } catch (cleanupError) {
    logger.warn('Tag smoke test cleanup failed', {
      step: label,
      errorMessage:
        cleanupError instanceof Error
          ? cleanupError.message
          : String(cleanupError),
    });
  }
}
