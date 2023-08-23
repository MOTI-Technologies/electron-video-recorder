/**
 * TODO: Rewrite this config to ESM
 * But currently electron-builder doesn't support ESM configs
 * @see https://github.com/develar/read-config-file/issues/10
 */

/**
 * @type {() => import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
module.exports = async function () {
  const {getVersion} = await import('./version/getVersion.mjs');

  return {
    directories: {
      output: 'dist',
      buildResources: 'buildResources',
    },
    files: ['packages/**/dist/**'],
    extraResources: [
      'node_modules/ffmpeg-static-electron/bin/${os}/${arch}/ffmpeg',
      'node_modules/ffmpeg-static-electron/index.js',
      'node_modules/ffmpeg-static-electron/package.json',
    ],
    extraMetadata: {
      version: getVersion(),
    },

    // Specify linux target just for disabling snap compilation
    linux: {
      target: 'deb',
    },
    mac: {
      files: [
        '!node_modules/ffmpeg-static-electron/bin/win${/*}',
        '!node_modules/ffmpeg-static-electron/bin/linux${/*}',
      ],
    },
    win: {
      files: [
        '!node_modules/ffmpeg-static-electron/bin/mac${/*}',
        '!node_modules/ffmpeg-static-electron/bin/linux${/*}',
      ],
    },
  };
};
