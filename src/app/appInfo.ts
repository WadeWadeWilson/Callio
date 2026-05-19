import {
  APP_ENV,
  APP_NAME,
  APP_TAGLINE,
  MVP_PLATFORM,
  STORAGE_STRATEGY,
  type AppEnvironment,
  type PlatformTarget,
  type StorageStrategy,
} from './config';

export type AppInfo = {
  appName: typeof APP_NAME;
  appTagline: typeof APP_TAGLINE;
  appVersion: string;
  buildNumber: string;
  environment: AppEnvironment;
  platformTarget: PlatformTarget;
  storageStrategy: StorageStrategy;
};

export const appInfo: AppInfo = {
  appName: APP_NAME,
  appTagline: APP_TAGLINE,
  appVersion: '0.1.0',
  buildNumber: '1',
  environment: APP_ENV,
  platformTarget: MVP_PLATFORM,
  storageStrategy: STORAGE_STRATEGY,
};
