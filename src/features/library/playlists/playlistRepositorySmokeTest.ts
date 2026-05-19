import { createAudioItemRepository } from '../audioItems';
import { AppError } from '../../../utils/errors';
import { logger } from '../../../utils/logger';
import { createPlaylistRepository } from './index';

const DEBUG_TRACK_1_FILE_PATH = 'debug/audio/debug-playlist-track-1.mp3';
const DEBUG_TRACK_2_FILE_PATH = 'debug/audio/debug-playlist-track-2.mp3';
const DEBUG_TRACK_1_TITLE = 'Debug Playlist Track 1';
const DEBUG_TRACK_2_TITLE = 'Debug Playlist Track 2';

export async function runPlaylistRepositorySmokeTest(): Promise<void> {
  const audioItemRepository = createAudioItemRepository();
  const playlistRepository = createPlaylistRepository();
  const timestamp = Date.now();
  const playlistName = `Debug Playlist ${timestamp}`;
  let playlistId: string | undefined;
  let audioItem1Id: string | undefined;
  let audioItem2Id: string | undefined;

  try {
    await deleteStaleDebugAudioItems();

    const audioItem1 = await audioItemRepository.create({
      title: DEBUG_TRACK_1_TITLE,
      creator: 'Callio',
      mediaType: 'music',
      filePath: DEBUG_TRACK_1_FILE_PATH,
      durationMs: 60000,
    });
    audioItem1Id = audioItem1.id;

    const audioItem2 = await audioItemRepository.create({
      title: DEBUG_TRACK_2_TITLE,
      creator: 'Callio',
      mediaType: 'music',
      filePath: DEBUG_TRACK_2_FILE_PATH,
      durationMs: 90000,
    });
    audioItem2Id = audioItem2.id;

    const playlist = await playlistRepository.create({ name: playlistName });
    playlistId = playlist.id;

    const playlistItem1 = await playlistRepository.addItem(
      playlist.id,
      audioItem1.id,
    );
    const playlistItem2 = await playlistRepository.addItem(
      playlist.id,
      audioItem2.id,
      0,
    );

    const initialItems = await playlistRepository.listItems(playlist.id);
    assertItemOrder(
      initialItems.map(item => item.id),
      [playlistItem2.id, playlistItem1.id],
    );

    await playlistRepository.reorderItems(playlist.id, [
      playlistItem1.id,
      playlistItem2.id,
    ]);
    const reorderedItems = await playlistRepository.listItems(playlist.id);
    assertItemOrder(
      reorderedItems.map(item => item.id),
      [playlistItem1.id, playlistItem2.id],
    );

    const playlistWithItems = await playlistRepository.getWithItems(
      playlist.id,
    );

    if (!playlistWithItems || playlistWithItems.items.length !== 2) {
      throw new AppError(
        'DATABASE_ERROR',
        'Playlist smoke test did not load playlist with items.',
      );
    }

    await playlistRepository.updateResumeState(
      playlist.id,
      audioItem2.id,
      15000,
    );
    const resumedPlaylist = await playlistRepository.getById(playlist.id);

    if (
      !resumedPlaylist ||
      resumedPlaylist.currentAudioItemId !== audioItem2.id ||
      resumedPlaylist.currentPositionMs !== 15000
    ) {
      throw new AppError(
        'DATABASE_ERROR',
        'Playlist smoke test did not update resume state.',
      );
    }

    await playlistRepository.update(playlist.id, { isFavorite: true });
    const searchResults = await playlistRepository.list({
      searchQuery: 'Debug Playlist',
      isFavorite: true,
      limit: 10,
    });

    if (!searchResults.some(item => item.id === playlist.id)) {
      throw new AppError(
        'DATABASE_ERROR',
        'Playlist smoke test did not find updated playlist.',
      );
    }

    await playlistRepository.removeAudioItemFromPlaylist(
      playlist.id,
      audioItem1.id,
    );
    const itemsAfterAudioItemRemove = await playlistRepository.listItems(
      playlist.id,
    );

    if (
      itemsAfterAudioItemRemove.length !== 1 ||
      itemsAfterAudioItemRemove[0]?.position !== 0 ||
      itemsAfterAudioItemRemove[0]?.id !== playlistItem2.id
    ) {
      throw new AppError(
        'DATABASE_ERROR',
        'Playlist smoke test did not remove audio item from playlist.',
      );
    }

    const readdedPlaylistItem = await playlistRepository.addItem(
      playlist.id,
      audioItem1.id,
    );
    await playlistRepository.removeItem(readdedPlaylistItem.id);
    const itemsAfterItemRemove = await playlistRepository.listItems(
      playlist.id,
    );

    if (
      itemsAfterItemRemove.length !== 1 ||
      itemsAfterItemRemove[0]?.position !== 0 ||
      itemsAfterItemRemove[0]?.id !== playlistItem2.id
    ) {
      throw new AppError(
        'DATABASE_ERROR',
        'Playlist smoke test did not normalize positions after item remove.',
      );
    }

    await playlistRepository.clearItems(playlist.id);
    const itemsAfterClear = await playlistRepository.listItems(playlist.id);

    if (itemsAfterClear.length !== 0) {
      throw new AppError(
        'DATABASE_ERROR',
        'Playlist smoke test did not clear playlist items.',
      );
    }

    await playlistRepository.delete(playlist.id);
    playlistId = undefined;

    await audioItemRepository.delete(audioItem1.id);
    audioItem1Id = undefined;

    await audioItemRepository.delete(audioItem2.id);
    audioItem2Id = undefined;

    const totalCount = await playlistRepository.count();

    logger.info('Playlist repository smoke test passed', {
      count: totalCount,
    });
  } catch (error) {
    if (playlistId) {
      const playlistIdToCleanUp = playlistId;
      await runCleanupStep('delete debug playlist', () =>
        playlistRepository.delete(playlistIdToCleanUp),
      );
    }

    if (audioItem1Id) {
      const audioItemIdToCleanUp = audioItem1Id;
      await runCleanupStep('delete debug playlist track 1', () =>
        audioItemRepository.delete(audioItemIdToCleanUp),
      );
    }

    if (audioItem2Id) {
      const audioItemIdToCleanUp = audioItem2Id;
      await runCleanupStep('delete debug playlist track 2', () =>
        audioItemRepository.delete(audioItemIdToCleanUp),
      );
    }

    const appError =
      error instanceof AppError
        ? error
        : new AppError(
            'DATABASE_ERROR',
            'Playlist repository smoke test failed.',
            { cause: error },
          );

    logger.error('Playlist repository smoke test failed', {
      code: appError.code,
      errorMessage: appError.message,
    });

    throw appError;
  }

  async function deleteStaleDebugAudioItems(): Promise<void> {
    const debugItems = await audioItemRepository.list({
      searchQuery: 'Debug Playlist Track',
      limit: 50,
    });

    for (const item of debugItems) {
      if (
        item.creator === 'Callio' &&
        (item.filePath === DEBUG_TRACK_1_FILE_PATH ||
          item.filePath === DEBUG_TRACK_2_FILE_PATH)
      ) {
        await audioItemRepository.delete(item.id);
      }
    }
  }
}

function assertItemOrder(actualIds: string[], expectedIds: string[]): void {
  const matches =
    actualIds.length === expectedIds.length &&
    actualIds.every((id, index) => id === expectedIds[index]);

  if (!matches) {
    throw new AppError('DATABASE_ERROR', 'Playlist item order did not match.');
  }
}

async function runCleanupStep(
  label: string,
  callback: () => Promise<void>,
): Promise<void> {
  try {
    await callback();
  } catch (cleanupError) {
    logger.warn('Playlist smoke test cleanup failed', {
      step: label,
      errorMessage:
        cleanupError instanceof Error
          ? cleanupError.message
          : String(cleanupError),
    });
  }
}
