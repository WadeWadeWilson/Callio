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

Aktuell enthaelt Callio das stabile Projektfundament, typisierte Basis-Navigation und einfache Platzhalter-Screens. Audio-, Import-, Datenbank-, Backup-, Playlist- und Queue-Funktionen sind noch nicht implementiert.
