# Callio

Callio ist ein minimalistischer Offline-Audioplayer im React-Native-Bare-Workflow mit TypeScript. Das MVP ist Android-first.

## Setup

```sh
npm install
```

Metro starten:

```sh
npm start
```

Android-App bauen und starten:

```sh
npm run android
```

TypeScript pruefen:

```sh
npm run typecheck
```

Unter Windows PowerShell kann alternativ `npm.cmd` verwendet werden, falls lokale Script-Ausfuehrung deaktiviert ist.

## Navigation

Callio nutzt eine typisierte React-Navigation-Struktur:

- `NavigationContainer` mit Native Stack
- `MainTabs` als Hauptbereich
- Bottom Tabs fuer `Home` und `Library`
- separater `Player`-Screen im Root Stack

Installierte Navigation Libraries:

- `@react-navigation/native`
- `@react-navigation/bottom-tabs`
- `@react-navigation/native-stack`
- `react-native-screens`
- `react-native-safe-area-context`

## Design-System

Callio nutzt fuer die UI-Grundlage den React-Native-`StyleSheet`-Fallback mit zentralen TypeScript-Tokens. NativeWind wurde fuer dieses Bare-Projekt geprueft, aber nicht beibehalten, weil das Framework-less-Setup zusaetzlich eine NativeWind/Tailwind-Metro-Pipeline und `react-native-reanimated` erfordert. Fuer dieses Ticket bleibt die UI bewusst stabil, simpel und ohne weitere native Styling-Abhaengigkeiten.

Theme-Dateien:

- `src/theme/colors.ts`
- `src/theme/spacing.ts`
- `src/theme/typography.ts`
- `src/theme/radius.ts`
- `src/theme/shadows.ts`
- `src/theme/index.ts`

Wiederverwendbare UI-Komponenten:

- `src/components/Screen.tsx`
- `src/components/Card.tsx`
- `src/components/AppText.tsx`
- `src/components/AppButton.tsx`
- `src/components/SectionHeader.tsx`
- `src/components/EmptyState.tsx`

Dieses Ticket enthaelt nur UI-Grundlagen und visuelle Platzhalter. Es implementiert keine Audio-, Import-, Datenbank-, Backup-, Playlist- oder Queue-Funktionen.

## App-Konfiguration

Lokale App-Konfiguration liegt in `src/app/config.ts`. Sie enthaelt zentrale, nicht geheime Werte:

- `APP_NAME`
- `APP_TAGLINE`
- `APP_ENV`
- `IS_DEV`
- `MVP_PLATFORM`
- `STORAGE_STRATEGY`

`src/app/appInfo.ts` stellt daraus eine einfache App-Info-Struktur bereit. Version und Build Number sind aktuell statisch (`0.1.0`, Build `1`) und koennen spaeter durch native Build-Werte ersetzt werden.

## Logging

Callio nutzt `src/utils/logger.ts` als lokale Logger-Utility ohne externe Dienste. Verfuegbar sind:

- `logger.debug(message, context?)`
- `logger.info(message, context?)`
- `logger.warn(message, context?)`
- `logger.error(message, context?)`

In Development schreiben alle Methoden in die Konsole. In Production bleiben `debug` und `info` still, waehrend `warn` und `error` weiter ausgeben duerfen. Es werden keine Logs gespeichert, keine Analytics eingebaut und keine externen Logging-Services wie Sentry verwendet.

## Error Handling

`src/utils/errors.ts` enthaelt eine einfache `AppError`-Klasse und vorbereitete Fehlercodes fuer spaetere Features:

- `UNKNOWN_ERROR`
- `FILE_PICKER_ERROR`
- `FILE_COPY_ERROR`
- `DATABASE_ERROR`
- `PLAYBACK_ERROR`
- `BACKUP_ERROR`
- `RESTORE_ERROR`

Das ist nur die Grundlage. Es gibt noch keine Feature-Fehlerlogik.

## Lokale Datenbank

Callio nutzt `@op-engineering/op-sqlite` als SQLite-Treiber fuer lokale Offline-Persistenz in der React-Native-Bare-App. Der Treiber wird hinter der eigenen Abstraktion `DatabaseConnection` gekapselt, damit der Rest der App nicht direkt `op-sqlite` importieren muss.

Datenbank-Grundlage:

- Datenbankdatei: `callio.db`
- Einstieg: `src/storage/database/DatabaseProvider.ts`
- Treiber-Kapselung: `src/storage/database/database.ts`
- Typen: `src/storage/database/types.ts`
- SQL-Helfer: `src/storage/database/sql.ts`
- Migrationen: `src/storage/database/migrations.ts`
- Smoke Test: `src/storage/database/smokeTest.ts`
- Schema Check: `src/storage/database/schemaCheck.ts`
- MVP Row-Typen: `src/storage/database/schema.ts`

Das Migration-System erstellt die interne Tabelle `schema_migrations` und fuehrt Migrationen versioniert aus. Foreign Keys werden vor dem Migrationslauf per `PRAGMA foreign_keys = ON` aktiviert.

Migrationen:

- Version `1`: `create_debug_kv_table`
- Version `2`: `create_callio_mvp_schema`

Version `1` erstellt die technische Debug-Tabelle `debug_kv`:

```text
debug_kv
  key TEXT PRIMARY KEY
  value TEXT NOT NULL
  created_at TEXT NOT NULL
  updated_at TEXT NOT NULL
```

Version `2` erstellt das MVP-Schema:

- `audio_items`
- `tags`
- `audio_item_tags`
- `playlists`
- `playlist_items`
- `playback_sessions`
- `app_settings`

Zusaetzlich werden zentrale Indizes fuer Media Type, Zeitfelder, Favoriten, Tags und Playlist-Positionen angelegt.

Im Development fuehrt der App-Start einen Smoke Test aus. Dabei wird der Key `db_smoke_test` in `debug_kv` geschrieben und wieder gelesen. Danach prueft `runSchemaCheck()`, ob alle MVP-Tabellen und zentralen Indizes existieren. Fehler werden geloggt, crashen die App aber nicht.

Repository-Implementierungen werden schrittweise ergaenzt. Produktlogik, Import, File-System-Zugriff, Backup, Playlist-, Queue- und Playback-Funktionen sind noch nicht implementiert.

## AudioItemRepository

`src/features/library/audioItems` enthaelt die erste produktive Repository-Schicht fuer `audio_items`. Die App arbeitet damit ueber Domain-Typen und Mapper statt ueber rohes SQL in Screens oder Features.

Dateien:

- `types.ts`
- `audioItemMapper.ts`
- `AudioItemRepository.ts`
- `SqliteAudioItemRepository.ts`
- `audioItemRepositorySmokeTest.ts`
- `index.ts`

Unterstuetzte Methoden:

- `create`
- `getById`
- `list`
- `update`
- `delete`
- `count`
- `updateProgress`
- `markPlayed`
- `setFavorite`
- `setPinned`

Im Development fuehrt der App-Start `runAudioItemRepositorySmokeTest()` aus. Der Smoke Test erstellt einen Debug-Track, liest ihn per ID, aktualisiert Fortschritt und Favorit, sucht nach `Debug`, fragt den Count ab und loescht den Debug-Datensatz danach wieder. Fehler werden geloggt und sollen die App nicht crashen.

Dieses Repository ist nur die technische Grundlage. Es gibt noch keinen echten Import, keinen File-System-Zugriff, kein Audio-Playback und keine Library-UI mit echten Daten.

## AppInfoPanel

`src/components/AppInfoPanel.tsx` zeigt App-Name, Version, Build Number, Environment, Platform Target und Storage Strategy. Das Panel ist dezent im Home-Screen eingebunden und nutzt die bestehenden UI-Komponenten.

## Projektstruktur

```text
src/
  app/
  screens/
  components/
  features/
  services/
  repositories/
  storage/
  playback/
  navigation/
  theme/
  utils/
```

Aktuell enthaelt Callio das stabile Projektfundament, typisierte Basis-Navigation, einfache Platzhalter-Screens und die ersten lokalen Datenbank-Grundlagen. Import-, Backup-, Playlist-, Queue- und Playback-Funktionen sind noch nicht implementiert.
