import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cloud.bananalabs.bananadoro',
  appName: 'Bananadoro',
  webDir: 'public',
  server: {
    url: 'https://bananadoro.bananalabs.cloud',
    cleartext: false
  }
};

export default config;
