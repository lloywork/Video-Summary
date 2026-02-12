const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

if (process.env.NODE_ENV == null) {
  process.env.NODE_ENV = 'development';
}

const config = {
  target: 'web',
  mode: process.env.NODE_ENV || 'development',
  devtool: process.env.NODE_ENV === 'production' ? false : 'cheap-module-source-map',

  // ── Entry Points ──────────────────────────────────────────
  // One bundle per platform + one for autofill + one for background
  entry: {
    // Platform content scripts (bundled with core modules)
    'content/youtube': path.join(__dirname, 'src', 'platforms', 'youtube', 'index.js'),
    'content/udemy': path.join(__dirname, 'src', 'platforms', 'udemy', 'index.js'),
    'content/coursera': path.join(__dirname, 'src', 'platforms', 'coursera', 'index.js'),
    'content/datacamp': path.join(__dirname, 'src', 'platforms', 'datacamp', 'index.js'),

    // Background service worker
    'background': path.join(__dirname, 'src', 'background.js'),
  },

  output: {
    path: path.join(__dirname, 'Video Summary Extension'),
    filename: '[name].bundle.js',
    clean: true,
  },

  // ── Static Assets ─────────────────────────────────────────
  // Copy files that don't need bundling directly to dist/
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        // Manifest
        { from: 'manifest.dist.json', to: 'manifest.json' },

        // Utility scripts (loaded as separate content scripts, not bundled)
        { from: 'src/utils/storage.js', to: 'utils/storage.js' },
        { from: 'src/utils/clipboard.js', to: 'utils/clipboard.js' },

        // Shared content scripts (not bundled, loaded separately)
        { from: 'src/content/transcript.js', to: 'content/transcript.js' },
        { from: 'src/content/prompt.js', to: 'content/prompt.js' },
        { from: 'src/content/autofill.js', to: 'content/autofill.js' },

        // CSS files
        { from: 'src/content/style.css', to: 'content/style.css' },
        { from: 'src/content/udemy-style.css', to: 'content/udemy-style.css' },
        { from: 'src/content/coursera-style.css', to: 'content/coursera-style.css' },
        { from: 'src/content/datacamp-style.css', to: 'content/datacamp-style.css' },

        // Options page (HTML, CSS, JS — not bundled)
        { from: 'src/options', to: 'options' },
      ],
    }),
  ],
};

module.exports = config;