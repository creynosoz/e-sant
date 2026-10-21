import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// El build genera un único index.html autocontenido (JS y CSS embebidos),
// que se puede abrir con doble clic (file://) o subir a cualquier hosting estático.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  test: {
    environment: 'node',
  },
});
