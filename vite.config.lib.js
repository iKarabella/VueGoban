import { defineConfig } from 'vite';
import vue              from '@vitejs/plugin-vue';
import { resolve }      from 'path';

export default defineConfig({
  plugins: [vue()],

  build: {
    // Режим библиотеки
    lib: {
      entry:    resolve(__dirname, 'src/index.js'),
      name:     'Vue-Goban',
      fileName: (format) => `vue-goban.${format}.${format === 'es' ? 'js' : 'cjs'}`,
      formats:  ['es', 'umd'],
    },

    rollupOptions: {
      // Vue — внешняя зависимость, не включаем в бандл
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue',
        },
        assetFileNames: (assetInfo) => {
          return assetInfo.name;
        },
      },
    },

    // Генерируем sourcemap для отладки
    sourcemap: true,

    // Очищаем dist перед сборкой
    emptyOutDir: true,
  },
});