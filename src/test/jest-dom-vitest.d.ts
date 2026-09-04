import type MatchersModule from '@testing-library/jest-dom/matchers';

// @testing-library/jest-dom's own `/vitest` type augmentation (types/vitest.d.ts) declares
// `Assertion<T = any>`, a single type param left over from vitest 4. Vitest 5's real
// `Assertion` interface takes two (`Assertion<R = void, T = unknown>`), so that augmentation
// silently binds jest-dom's matchers to the wrong param (the assertion's *value* type ends up
// in the *return* type slot) instead of raising a "must have identical type parameters" error.
// This re-declares it correctly until jest-dom ships a vitest-5-compatible release. jest-dom's
// `TestingLibraryMatchers<E, R>` doesn't constrain the asserted-on value at all (matchers check
// it at runtime), so vitest's `T` isn't used here - only `R` (the matcher's return type).
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-interface, @typescript-eslint/no-explicit-any */
declare module 'vitest' {
  interface Assertion<R = void, T = unknown> extends MatchersModule.TestingLibraryMatchers<
    any,
    R
  > {}
  interface AsymmetricMatchersContaining extends MatchersModule.TestingLibraryMatchers<any, void> {}
}
/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-interface, @typescript-eslint/no-explicit-any */
