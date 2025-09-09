import { defineConfig } from 'vitest/config';

/**
 * 95% is a real gate, not an aspiration — this package has no I/O, no clock and no
 * network, so anything uncovered here is uncovered because nobody wrote the test.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['default'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/test-support/**',
        // Pure type modules compile to nothing; v8 reports them as 0/0 and drags the ratio.
        'src/types/**',
        // TODO(PAY-1755): java arm is manual-run only; cover it when someone touches it.
