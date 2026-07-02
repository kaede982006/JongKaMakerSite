import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'app',
  plugins: [react()],
  base: '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    cssMinify: false,
    reportCompressedSize: false,
    sourcemap: false,
    minify: 'oxc',
    target: 'es2020'
  }
});
