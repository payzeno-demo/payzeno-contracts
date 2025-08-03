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
