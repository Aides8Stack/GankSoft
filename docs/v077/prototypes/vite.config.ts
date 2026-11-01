import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  root:fileURLToPath(new URL('.',import.meta.url)),
  base:'./',
  plugins:[vue()],
  server:{host:'127.0.0.1',port:4177,strictPort:false},
  build:{outDir:fileURLToPath(new URL('./dist',import.meta.url)),emptyOutDir:true},
});
