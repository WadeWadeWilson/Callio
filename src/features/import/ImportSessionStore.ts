import type { ImportSession } from './types';

let currentImportSession: ImportSession | null = null;

export function getCurrentImportSession(): ImportSession | null {
  return currentImportSession;
}

export function setCurrentImportSession(session: ImportSession): void {
  currentImportSession = session;
}

export function updateCurrentImportSession(session: ImportSession): void {
  currentImportSession = session;
}

export function clearCurrentImportSession(): void {
  currentImportSession = null;
}
