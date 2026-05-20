import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import {
  clearCurrentImportSession,
  createImportPickerService,
  createImportTempStorageService,
  getCurrentImportSession,
  setCurrentImportSession,
  updateCurrentImportSession,
  type ImportCandidate,
  type ImportCandidateStatus,
  type ImportSession,
  type ImportSessionStatus,
} from '../features/import';
import { colors, radius, spacing } from '../theme';

const libraryPlaceholders = [
  'Musik',
  'Podcasts',
  'Hörbücher',
  'Tags',
  'Nicht organisiert',
];

const importPickerService = createImportPickerService();
const importTempStorageService = createImportTempStorageService();

export function LibraryScreen() {
  const [importSession, setImportSession] = useState<ImportSession | null>(() =>
    getCurrentImportSession(),
  );
  const [isPicking, setIsPicking] = useState(false);
  const [isPreparingTemp, setIsPreparingTemp] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const importCounts = useMemo(() => {
    const candidates = importSession?.candidates ?? [];

    return {
      selectedCount: candidates.filter(
        candidate => candidate.status === 'selected',
      ).length,
      copiedCount: candidates.filter(candidate => candidate.status === 'copied')
        .length,
      failedCount: candidates.filter(
        candidate => candidate.status === 'copy_error',
      ).length,
      skippedCount: candidates.filter(candidate =>
        ['unsupported', 'error'].includes(candidate.status),
      ).length,
    };
  }, [importSession]);
  const canPrepareTemp =
    !isPicking &&
    !isPreparingTemp &&
    Boolean(
      importSession?.candidates.some(
        candidate => candidate.status === 'selected',
      ),
    );
  const visibleSessionStatus: ImportSessionStatus | null = isPreparingTemp
    ? 'copying'
    : importSession?.status ?? null;

  const handlePickAudioFiles = async () => {
    setImportError(null);
    setIsPicking(true);

    try {
      const result = await importPickerService.pickAudioFiles();

      if (result) {
        setCurrentImportSession(result.session);
        setImportSession(result.session);
      }
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'Die Dateiauswahl konnte nicht geöffnet werden.',
      );
    } finally {
      setIsPicking(false);
    }
  };

  const handlePrepareTempSession = async () => {
    if (!importSession) {
      return;
    }

    setImportError(null);
    setIsPreparingTemp(true);

    try {
      const result = await importTempStorageService.copySessionToTemp(
        importSession,
      );
      updateCurrentImportSession(result.session);
      setImportSession(result.session);

      if (result.failedCount > 0 && result.copiedCount === 0) {
        setImportError('Keine Datei konnte temporär vorbereitet werden.');
      }
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'Die Dateien konnten nicht temporär vorbereitet werden.',
      );
    } finally {
      setIsPreparingTemp(false);
    }
  };

  const handleClearSelection = async () => {
    const sessionToClear = importSession;

    setImportError(null);

    try {
      if (sessionToClear) {
        await importTempStorageService.clearTempSession(sessionToClear);
      }
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'Die temporäre Auswahl konnte nicht vollständig verworfen werden.',
      );
    } finally {
      clearCurrentImportSession();
      setImportSession(null);
    }
  };

  return (
    <Screen>
      <AppText variant="title">Bibliothek</AppText>

      <SectionHeader title="Alle Inhalte" />
      <Card>
        <EmptyState
          description="Der Import kommt in einem späteren Schritt."
          title="Noch keine Inhalte importiert."
        />
      </Card>

      <SectionHeader title="Import vorbereiten" />
      <Card>
        <View style={styles.importActions}>
          <AppButton
            loading={isPicking}
            onPress={handlePickAudioFiles}
            title="Audio auswählen"
          />
          <AppButton
            disabled={!canPrepareTemp}
            loading={isPreparingTemp}
            onPress={handlePrepareTempSession}
            title="Temporär vorbereiten"
            variant="secondary"
          />
          {importSession ? (
            <AppButton
              onPress={handleClearSelection}
              title="Auswahl verwerfen"
              variant="secondary"
            />
          ) : null}
        </View>

        {importError ? (
          <AppText color={colors.danger} style={styles.importMessage}>
            {importError}
          </AppText>
        ) : null}

        {importSession ? (
          <View style={styles.importResult}>
            <View style={styles.sessionStatus}>
              <AppText variant="caption">Session</AppText>
              <AppText
                color={
                  visibleSessionStatus
                    ? getSessionStatusColor(visibleSessionStatus)
                    : colors.textMuted
                }
                variant="section"
              >
                {visibleSessionStatus
                  ? getSessionStatusLabel(visibleSessionStatus)
                  : 'ohne Status'}
              </AppText>
            </View>

            <View style={styles.summaryRow}>
              <ImportSummaryItem
                label="Ausgewählt"
                value={importCounts.selectedCount}
              />
              <ImportSummaryItem
                label="Kopiert"
                value={importCounts.copiedCount}
              />
            </View>
            <View style={styles.summaryRow}>
              <ImportSummaryItem
                label="Fehler"
                value={importCounts.failedCount}
              />
              <ImportSummaryItem
                label="Übersprungen"
                value={importCounts.skippedCount}
              />
            </View>

            <View style={styles.candidateList}>
              {importSession.candidates.map(candidate => (
                <ImportCandidateItem candidate={candidate} key={candidate.id} />
              ))}
            </View>
          </View>
        ) : (
          <AppText color={colors.textSecondary} style={styles.importMessage}>
            Noch keine Auswahl vorbereitet.
          </AppText>
        )}
      </Card>

      <SectionHeader title="Sammlungen" />
      <Card>
        <AppText color={colors.textSecondary}>
          Platzhalter für die spätere Organisation deiner Bibliothek.
        </AppText>
        <AppText variant="caption" style={styles.caption}>
          Noch ohne Filterfunktion
        </AppText>
        <View style={styles.chipGroup}>
          {libraryPlaceholders.map(item => (
            <AppText key={item} style={styles.chip} variant="muted">
              {item}
            </AppText>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

type ImportSummaryItemProps = {
  label: string;
  value: number;
};

function ImportSummaryItem({ label, value }: ImportSummaryItemProps) {
  return (
    <View style={styles.summaryItem}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="section">{value}</AppText>
    </View>
  );
}

type ImportCandidateItemProps = {
  candidate: ImportCandidate;
};

function ImportCandidateItem({ candidate }: ImportCandidateItemProps) {
  return (
    <View style={styles.candidateItem}>
      <View style={styles.candidateHeader}>
        <AppText style={styles.candidateName}>{candidate.name}</AppText>
        <AppText
          color={getStatusColor(candidate.status)}
          style={styles.statusText}
          variant="caption"
        >
          {getStatusLabel(candidate.status)}
        </AppText>
      </View>
      <AppText color={colors.textSecondary} variant="muted">
        {formatCandidateMeta(candidate)}
      </AppText>
      {candidate.tempFileName ? (
        <AppText color={colors.textSecondary} variant="muted">
          Temp-Datei: {candidate.tempFileName}
        </AppText>
      ) : null}
      {candidate.tempLocalUri ? (
        <AppText
          color={colors.textMuted}
          numberOfLines={2}
          style={styles.tempUri}
          variant="muted"
        >
          {candidate.tempLocalUri}
        </AppText>
      ) : null}
      {candidate.copyErrorMessage ? (
        <AppText color={colors.danger} style={styles.errorText} variant="muted">
          {candidate.copyErrorMessage}
        </AppText>
      ) : null}
      {candidate.errorMessage ? (
        <AppText color={colors.danger} style={styles.errorText} variant="muted">
          {candidate.errorMessage}
        </AppText>
      ) : null}
    </View>
  );
}

function formatCandidateMeta(candidate: ImportCandidate): string {
  const extension = candidate.extension
    ? `.${candidate.extension}`
    : 'ohne Endung';
  const mimeType = candidate.mimeType ?? 'ohne MIME-Type';
  const size =
    candidate.size === null ? 'Größe unbekannt' : formatBytes(candidate.size);

  return `${extension} · ${mimeType} · ${size}`;
}

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  const kilobytes = size / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function getStatusLabel(status: ImportCandidateStatus): string {
  const labels: Record<ImportCandidateStatus, string> = {
    selected: 'bereit',
    copying: 'kopiert',
    copied: 'temp bereit',
    copy_error: 'Kopierfehler',
    unsupported: 'nicht unterstützt',
    error: 'Fehler',
  };

  return labels[status];
}

function getStatusColor(status: ImportCandidateStatus): string {
  const colorsByStatus: Record<ImportCandidateStatus, string> = {
    selected: colors.accent,
    copying: colors.textSecondary,
    copied: colors.accent,
    copy_error: colors.danger,
    unsupported: colors.textMuted,
    error: colors.danger,
  };

  return colorsByStatus[status];
}

function getSessionStatusLabel(status: ImportSessionStatus): string {
  const labels: Record<ImportSessionStatus, string> = {
    selected: 'ausgewählt',
    copying: 'kopiert',
    ready: 'temp bereit',
    error: 'Fehler',
    cleared: 'verworfen',
  };

  return labels[status];
}

function getSessionStatusColor(status: ImportSessionStatus): string {
  const colorsByStatus: Record<ImportSessionStatus, string> = {
    selected: colors.textSecondary,
    copying: colors.textSecondary,
    ready: colors.accent,
    error: colors.danger,
    cleared: colors.textMuted,
  };

  return colorsByStatus[status];
}

const styles = StyleSheet.create({
  caption: {
    marginTop: spacing.sm,
  },
  candidateHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  candidateItem: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  candidateList: {
    gap: spacing.sm,
  },
  candidateName: {
    flex: 1,
  },
  chip: {
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipGroup: {
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  errorText: {
    marginTop: spacing.xs,
  },
  importActions: {
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  importMessage: {
    marginTop: spacing.md,
  },
  importResult: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  sessionStatus: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  statusText: {
    textAlign: 'right',
  },
  summaryItem: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tempUri: {
    marginTop: spacing.xs,
  },
});
