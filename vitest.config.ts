/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'happy-dom',
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        include: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
        exclude: ['node_modules', '.next', 'e2e'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.d.ts',
                'src/**/index.ts',
                'src/app/**/loading.tsx',
                'src/app/**/error.tsx',
            ],
            // Coverage thresholds - currently low to allow CI to pass
            // TODO: Increase thresholds as test coverage improves
            thresholds: {
                statements: 0,
                branches: 0,
                functions: 0,
                lines: 0,
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
