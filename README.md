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
