import json from '@rollup/plugin-json'
import typescript from '@rollup/plugin-typescript'
import run from '@rollup/plugin-run'

const dev = process.env.NODE_ENV !== 'production'

export default {
  input: 'src/server/index.ts',
  output: {
    sourcemap: true,
    dir: 'build',
    format: 'cjs',
  },

  plugins: [typescript({sourceMap: true}), dev && run()],
}
