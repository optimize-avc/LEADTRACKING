import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        '.next/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
        'scripts/**',
        'node_modules/**',
        // Firebase build artifacts
        '.firebase/**',
        '*.txt',
        '*.log',
        // Nested project
        'antigrav lead&sales Tracking/**',
    ]),
    // Custom rules - downgrade common warnings to not fail CI
    {
        rules: {
            // Allow unused vars prefixed with underscore
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            // Allow exhaustive-deps warnings (common in React effects)
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
]);

export default eslintConfig;
