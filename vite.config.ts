import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SearchHighlight',
      fileName: (format) => `search-highlight.${format}.js`
    },
    // rollupOptions: {
    //   external: ['lodash-es'],
    //   output: {
    //     globals: {
    //       'lodash-es': 'lodash'
    //     }
    //   }
    // },
    outDir: 'dist'
  }
});
