import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'src/**/*', 'server/**/*', 'scripts/**/*', 'backups/**/*'],
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];
