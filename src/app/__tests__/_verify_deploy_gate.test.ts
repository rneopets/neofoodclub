import { describe, it, expect } from 'vitest';

describe('deploy gate verification (temporary)', () => {
  it('intentionally fails to verify deploy is skipped on test failure', () => {
    expect(true).toBe(false);
  });
});
