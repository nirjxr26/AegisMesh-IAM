const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**', 'logs/**', 'prisma/migrations/**']
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern:
            '^(?:_|allPresent|scheduleCleanup|logger|crypto|http|options|getStats|req|res|next|result|sendWelcomeEmail|prisma|error|mfaSecret|emailVerifyToken|passwordResetToken|passwordResetExpires|userRoles|sessionsRevokedCount|currentPassword|passwordHash|mfaBackupCodes)$',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      'no-undef': 'error'
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    }
  }
];
