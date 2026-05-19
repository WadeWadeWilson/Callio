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
