import { defineConfig, mergeConfig } from 'vitest/config';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import viteConfig from './vite.config.ts';

export default mergeConfig(viteConfig, defineConfig({
  resolve: { alias: [{ find: /^react$/, replacement: require.resolve('react') }] },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.tsx'],
    setupFiles: ['tests/setup.ts'],
    server: { deps: { inline: ['lucide-react', 'zustand', 'react-hook-form', '@hookform/resolvers'] } },
  },
}));
