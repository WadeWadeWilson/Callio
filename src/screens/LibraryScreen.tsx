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
  getCurrentImportSession,
  setCurrentImportSession,
  type ImportCandidate,
  type ImportCandidateStatus,
  type ImportSession,
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

export function LibraryScreen() {
  const [importSession, setImportSession] = useState<ImportSession | null>(() =>
    getCurrentImportSession(),
  );
  const [isPicking, setIsPicking] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const importCounts = useMemo(() => {
    const candidates = importSession?.candidates ?? [];

    return {
      acceptedCount: candidates.filter(
        candidate => candidate.status === 'selected',
      ).length,
      rejectedCount: candidates.filter(
        candidate => candidate.status !== 'selected',
      ).length,
    };
  }, [importSession]);

  const handlePickAudioFiles = async () => {
    setPickerError(null);
    setIsPicking(true);

    try {
      const result = await importPickerService.pickAudioFiles();

      if (result) {
        setCurrentImportSession(result.session);
        setImportSession(result.session);
      }
    } catch (error) {
      setPickerError(
        error instanceof Error
          ? error.message
          : 'Die Dateiauswahl konnte nicht geöffnet werden.',
      );
    } finally {
      setIsPicking(false);
    }
  };

  const handleClearSelection = () => {
    clearCurrentImportSession();
    setImportSession(null);
    setPickerError(null);
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
          {importSession ? (
            <AppButton
              onPress={handleClearSelection}
              title="Auswahl verwerfen"
              variant="secondary"
            />
          ) : null}
        </View>

        {pickerError ? (
          <AppText color={colors.danger} style={styles.importMessage}>
            {pickerError}
          </AppText>
        ) : null}

        {importSession ? (
          <View style={styles.importResult}>
            <View style={styles.summaryRow}>
              <ImportSummaryItem
                label="Akzeptiert"
                value={importCounts.acceptedCount}
              />
              <ImportSummaryItem
                label="Abgelehnt"
                value={importCounts.rejectedCount}
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
    candidate.size === null ? 'Groesse unbekannt' : formatBytes(candidate.size);

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
    unsupported: 'nicht unterstützt',
    error: 'Fehler',
  };

  return labels[status];
}

function getStatusColor(status: ImportCandidateStatus): string {
  const colorsByStatus: Record<ImportCandidateStatus, string> = {
    selected: colors.accent,
    unsupported: colors.textMuted,
    error: colors.danger,
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
});
