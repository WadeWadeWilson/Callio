# Callio

Callio ist ein minimalistischer Offline-Audioplayer im React-Native-Bare-Workflow. Das MVP ist Android-first.

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

Aktuell enthaelt Callio nur das stabile Projektfundament und einen einfachen dunklen Startscreen. Audio-, Import-, Datenbank-, Backup- und Playlist-Funktionen sind noch nicht implementiert.
