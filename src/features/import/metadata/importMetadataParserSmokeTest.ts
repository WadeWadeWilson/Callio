import { logger } from '../../../utils/logger';
import type { ImportCandidate } from '../types';
import {
  cleanAudioTitle,
  getExtensionFromName,
  inferCreatorAndTitle,
} from './fileNameCleaner';
import { parseDraftMetadataForCandidate } from './importMetadataParser';

export function runImportMetadataParserSmokeTest(): void {
  try {
    assertCleanedTitle(
      '01 - Daft Punk - One More Time.mp3',
      'Daft Punk - One More Time',
    );
    assertInferredMetadata('01 - Daft Punk - One More Time.mp3', {
      creator: 'Daft Punk',
      extension: 'mp3',
      title: 'One More Time',
    });
    assertInferredMetadata('chapter_001_the_beginning.mp3', {
      creator: null,
      extension: 'mp3',
      title: 'chapter 001 the beginning',
    });
    assertInferredMetadata('My_Audio_File__Test.wav', {
      creator: null,
      extension: 'wav',
      title: 'My Audio File Test',
    });
    assertInferredMetadata('Track Name (Official Audio).mp3', {
      creator: null,
      extension: 'mp3',
      title: 'Track Name',
    });
    assertInferredMetadata('', {
      creator: null,
      extension: null,
      title: 'Unbenannter Titel',
    });

    logger.info('Import metadata parser smoke test passed');
  } catch (error) {
    logger.error('Import metadata parser smoke test failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

type ExpectedDraftMetadata = {
  creator: string | null;
  extension: string | null;
  title: string;
};

function assertCleanedTitle(rawName: string, expectedTitle: string): void {
  const cleanedTitle = cleanAudioTitle(rawName);
  assertEqual(cleanedTitle, expectedTitle, `clean title for ${rawName}`);
}

function assertInferredMetadata(
  rawName: string,
  expected: ExpectedDraftMetadata,
): void {
  const cleanedTitle = cleanAudioTitle(rawName);
  const inferred = inferCreatorAndTitle(cleanedTitle);
  const metadata = parseDraftMetadataForCandidate(createCandidate(rawName));

  assertEqual(inferred.creator, expected.creator, `creator for ${rawName}`);
  assertEqual(
    metadata.creator,
    expected.creator,
    `draft creator for ${rawName}`,
  );
  assertEqual(metadata.title, expected.title, `draft title for ${rawName}`);
  assertEqual(
    metadata.extension,
    expected.extension,
    `draft extension for ${rawName}`,
  );
}

function createCandidate(name: string): ImportCandidate {
  return {
    id: `metadata_smoke_${name || 'empty'}`,
    sourceUri: `content://callio/${name}`,
    name,
    size: null,
    mimeType: null,
    extension: getExtensionFromName(name),
    inferredMediaType: 'music',
    status: 'selected',
    errorMessage: null,
    selectedAt: '2026-01-01T00:00:00.000Z',
    tempLocalUri: null,
    tempFileName: null,
    copyErrorMessage: null,
    copiedAt: null,
    draftMetadata: null,
  };
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected "${String(expected)}", received "${String(actual)}"`,
    );
  }
}
