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

const readEnvValue = (...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
};

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
  const scheme = readEnvValue('EXPO_PUBLIC_APP_SCHEME', 'APP_SCHEME') ?? 'fruitmate';
  const facebookAppId = readEnvValue('EXPO_PUBLIC_FACEBOOK_APP_ID', 'FACEBOOK_APP_ID');
  const facebookRedirectUri = readEnvValue(
    'EXPO_PUBLIC_FACEBOOK_REDIRECT_URI',
    'FACEBOOK_REDIRECT_URI'
  );
  const tiktokClientKey = readEnvValue('EXPO_PUBLIC_TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_KEY');
  const tiktokClientSecret = readEnvValue(
    'EXPO_PUBLIC_TIKTOK_CLIENT_SECRET',
    'TIKTOK_CLIENT_SECRET'
  );
  const tiktokRedirectUri = readEnvValue(
    'EXPO_PUBLIC_TIKTOK_REDIRECT_URI',
    'TIKTOK_REDIRECT_URI'
  );
  const shareFallbackUrl =
    readEnvValue('EXPO_PUBLIC_SHARE_FALLBACK_URL', 'SHARE_FALLBACK_URL') ??
    'https://fruitmate.app';

  return {
    name: 'mobile',
    slug: 'mobile',
    version: '1.0.0',
    scheme,
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
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      apiBaseUrl,
      appScheme: scheme,
      facebookAppId,
      facebookRedirectUri,
      tiktokClientKey,
      tiktokClientSecret,
      tiktokRedirectUri,
      shareFallbackUrl,
    },
    plugins: [
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: apiBaseUrl.startsWith('http://'),
          },
        },
      ],
      'expo-web-browser',
    ],
    experiments: {
      typedRoutes: true,
    },
  };
};
