// packages/shared/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/interfaces/index.ts',
        'src/constants/index.ts',
        'src/utils/index.ts'
    ],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    outDir: 'dist',
    sourcemap: true,
    splitting: true,
    treeshake: true,
    external: ['class-validator', 'class-transformer']
})