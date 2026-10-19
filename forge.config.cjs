module.exports = {
  packagerConfig: {
    icon: './assets/ganksoft.ico',
    asar: { unpack: '**/*.node' },
    overwrite: true,
    executableName: 'GankSoft',
    ignore: [
      /^\/src($|\/)/,
      /^\/tests($|\/)/,
      /^\/electron($|\/)/,
      /^\/shared($|\/)/,
      /^\/docs($|\/)/,
      /^\/\.git($|\/)/,
      /\.bundle$/,
    ],
  },
  makers: [{ name: '@electron-forge/maker-zip', platforms: ['win32'] }],
};
