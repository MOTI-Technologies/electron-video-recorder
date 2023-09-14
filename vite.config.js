/* eslint-env node */

import {sveltekit} from '@sveltejs/kit/vite';
import {chrome} from './.electron-vendors.cache.json';
import {renderer} from 'unplugin-auto-expose';
import {join} from 'node:path';
import {injectAppVersion} from './version/inject-app-version-plugin.mjs';
import createExternal from 'vite-plugin-external';

const PACKAGE_ROOT = __dirname;

/**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
const config = {
  mode: process.env.MODE,
  build: {
    sourcemap: true,
    target: `chrome${chrome}`,
    assetsDir: '.',
    emptyOutDir: true,
    reportCompressedSize: false,
  },
  test: {
    environment: 'happy-dom',
    include: ['./tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    /**
     * The default timeout of 5000ms is sometimes not enough for playwright.
     */
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  optimizeDeps: {
    exclude: ['agora-electron-sdk'],
  },
  plugins: [
    createExternal({
      externals: {
        // not sure what to do here yet, but think it's on the right track
        agora: 'agora-electron-sdk',
      },
    }),
    sveltekit(),
    renderer.vite({
      preloadEntry: join(PACKAGE_ROOT, 'packages/preload/src/index.ts'),
    }),
    injectAppVersion(),
  ],
};

export default config;
