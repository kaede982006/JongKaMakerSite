import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    cssMinify: false,
    reportCompressedSize: false,
    sourcemap: false,
    minify: 'oxc',
    target: 'es2020'
  }
});
