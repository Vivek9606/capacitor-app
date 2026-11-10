import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'in.betterhood.app',
  appName: 'Betterhood',
  webDir: 'dist',
  plugins: {
    SplashScreen: { launchShowDuration: 800, backgroundColor: '#5E1951' },
    StatusBar: { style: 'LIGHT', backgroundColor: '#FAF6F0' },
  },
}

export default config
