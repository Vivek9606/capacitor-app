import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'in.betterhood.app',
  appName: 'Betterhood',
  webDir: 'dist',
  plugins: {
    SplashScreen: { launchShowDuration: 800, backgroundColor: '#1F5C4E' },
    StatusBar: { style: 'LIGHT', backgroundColor: '#F4F3EE' },
  },
}

export default config
