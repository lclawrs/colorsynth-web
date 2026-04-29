import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'src/index.html',
        colorsynth: 'src/experiments/colorsynth/index.html',
        objects3d: 'src/experiments/objects3d/index.html',
        audio: 'src/experiments/audio/index.html',
        fractal: 'src/experiments/fractal/index.html',
      }
    }
  },
  base: '/colorsynth-web/'
})
