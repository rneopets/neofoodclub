import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const CONFIG = readFileSync(resolve(__dirname, '../../../vite.config.js'), 'utf8');

// A userscript manager only takes over a *.user.js response it sees on the network. If the
// service worker answers that request (from its precache, or with index.html), the install link
// silently stops opening Tampermonkey.
describe('service worker and the userscript install link', () => {
  it('does not precache user scripts', () => {
    expect(CONFIG).toMatch(/globIgnores:\s*\[[^\]]*'\*\*\/\*\.user\.js'/);
  });

  it('does not answer navigations to user scripts with index.html', () => {
    const denylist = /navigateFallbackDenylist:\s*\[\s*(\/[^\]]*\/)\s*\]/.exec(CONFIG);
    expect(denylist).not.toBeNull();

    const pattern = new RegExp(
      (denylist?.[1] ?? '').slice(1, (denylist?.[1] ?? '').lastIndexOf('/')),
    );
    expect(pattern.test('/scripts/neofoodclub.user.js')).toBe(true);
    expect(pattern.test('/')).toBe(false);
    expect(pattern.test('/some/other/path')).toBe(false);
  });
});

// Without these a new service worker waits until every tab of the site is closed, so the site
// keeps serving its old version (old links and all) to anyone who just refreshes.
describe('service worker updates', () => {
  it('activates a new service worker as soon as it has installed', () => {
    const workbox = /workbox:\s*\{([\s\S]*?)\n {6}\},/.exec(CONFIG)?.[1] ?? '';

    expect(workbox).toMatch(/skipWaiting:\s*true/);
    expect(workbox).toMatch(/clientsClaim:\s*true/);
  });
});
