import type { ConfigContext, ExpoConfig } from 'expo/config';
import fs from 'fs';
import path from 'path';

type EnvRecord = Record<string, string>;

const loadEnvIfExists = (relativePath: string) => {
  const fullPath = path.resolve(__dirname, relativePath);
  if (!fs.existsSync(fullPath)) {
    return;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    if (!line || line.trim().startsWith('#')) {
      return;
    }
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) {
      return;
    }
    const [, key, rawValue] = match;
    const cleaned = rawValue.replace(/^\s*['"]?/, '').replace(/['"]?\s*$/, '');
    if (typeof process.env[key] === 'undefined') {
      process.env[key] = cleaned;
    }
  });
};

loadEnvIfExists('.env');
loadEnvIfExists('../.env');

const resolveApiBaseUrl = () => {
  const envSources: EnvRecord = {
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
  };
  return (
    envSources.EXPO_PUBLIC_API_BASE_URL ||
    envSources.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:8000'
  );
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiBaseUrl = resolveApiBaseUrl();

  return {
    name: 'mobile',
    slug: 'mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      usesCleartextTraffic: apiBaseUrl.startsWith('http://'),
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      apiBaseUrl,
    },
    experiments: {
      typedRoutes: true,
    },
  };
};
