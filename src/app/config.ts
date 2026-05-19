export type AppEnvironment = 'development' | 'production';
export type PlatformTarget = 'android-first';
export type StorageStrategy = 'private-app-storage';

export const APP_NAME = 'Callio' as const;
export const APP_TAGLINE = 'Deine Audiobibliothek. Immer bereit.' as const;
export const APP_ENV: AppEnvironment = __DEV__ ? 'development' : 'production';
export const IS_DEV = __DEV__;
export const MVP_PLATFORM = 'android-first' as const satisfies PlatformTarget;
export const STORAGE_STRATEGY =
  'private-app-storage' as const satisfies StorageStrategy;
