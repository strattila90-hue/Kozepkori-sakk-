// Statikus elemzés: definiálatlan változók, halott kód, elgépelések. Futtatás: npm run lint
const globals = require('globals');
module.exports = [{
  files: ['js/**/*.js', 'sw.js', 'firebase-config.js'], ignores: ['js/qrcode.js'],
  languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser, ...globals.serviceworker, Sprites: 'readonly', Figures: 'readonly', W: 'writable', L: 'readonly', SFX: 'readonly', Chess: 'readonly', Net: 'readonly', Scenes: 'readonly', UI: 'writable', qrcode: 'readonly', module: 'readonly' } },
  rules: { 'no-undef': 'error', 'no-redeclare': 'error', 'no-dupe-keys': 'error', 'no-const-assign': 'error', 'no-self-assign': 'error', 'no-cond-assign': 'error', 'no-unreachable': 'warn', 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }] },
}];
