# End-to-End Testing with Playwright

This directory contains Playwright tests for NeoFoodClub.

## Test Files

- `smoke.spec.ts` - Basic smoke tests to verify the app loads and core functionality works
- `betting.spec.ts` - Tests for betting functionality, round selection, and URL handling
- `ui-interactions.spec.ts` - Tests for UI components, accessibility, and user interactions

## Running Tests

### Prerequisites

Make sure you have installed the dependencies:

```bash
npm install
```

### Running All Tests

```bash
# Run all tests headlessly
npm run test:e2e

# Run with browser UI (interactive mode)
npm run test:e2e:ui

# Run with browser visible (headed mode)
npm run test:e2e:headed

# Run only in Chromium
npm run test:e2e:chromium
```

### Running Specific Tests

```bash
# Run only smoke tests
npx playwright test smoke

# Run only betting tests
npx playwright test betting

# Run only UI interaction tests
npx playwright test ui-interactions

# Run tests matching a pattern
npx playwright test --grep "should load"
```

### Running Tests in Different Browsers

```bash
# Run in all browsers (Chrome, Firefox, Safari, Mobile)
npx playwright test

# Run in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Debug Mode

```bash
# Run with debug console
npx playwright test --debug

# Run specific test with debug
npx playwright test smoke --debug
```

## Test Reports

After running tests, you can view detailed reports:

```bash
# Open the HTML report
npx playwright show-report
```

## CI/CD

Tests are automatically run on:

- Push to `main` or `typescript` branches
- Pull requests to `main` or `typescript` branches

The GitHub Actions workflow will:

1. Install dependencies
2. Install Playwright browsers
3. Run all tests
4. Upload test reports and artifacts

## Writing New Tests

When adding new tests:

1. Follow the existing patterns in the test files
2. Use descriptive test names
3. Include proper assertions
4. Handle async operations with `await`
5. Use Page Object Models for complex interactions
6. Add timeouts for elements that may take time to load

## Best Practices

- Tests should be independent and not rely on state from other tests
- Use `test.beforeEach` for common setup
- Clean up after tests if needed
- Use meaningful selectors (prefer `data-testid` over CSS classes)
- Handle different loading states gracefully
- Test both success and error scenarios
