import { scan, setOptions } from 'react-scan';

const REACT_SCAN_ENABLED_KEY = 'nfcReactScanEnabled';

export interface ReactScanRuntimeOptions {
  enabled?: boolean;
  showToolbar?: boolean;
  log?: boolean;
  trackUnnecessaryRenders?: boolean;
  animationSpeed?: 'slow' | 'fast' | 'off';
  dangerouslyForceRunInProduction?: boolean;
}

function isReactScanDisabled(): boolean {
  return import.meta.env.DISABLE_REACT_SCAN === 'true';
}

function buildReactScanOptions(enabled: boolean): ReactScanRuntimeOptions {
  const isWebDriver = typeof navigator !== 'undefined' && navigator.webdriver;

  return {
    enabled: enabled && !isWebDriver,
    showToolbar: enabled,
    log: false,
    trackUnnecessaryRenders: true,
    animationSpeed: 'fast',
    dangerouslyForceRunInProduction: true,
  };
}

export function getReactScanEnabled(): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }

  if (localStorage.getItem(REACT_SCAN_ENABLED_KEY) === 'true') {
    return true;
  }

  try {
    const legacyOptions = JSON.parse(
      localStorage.getItem('react-scan-options') || '{}',
    ) as ReactScanRuntimeOptions;
    if (legacyOptions.enabled === true) {
      localStorage.setItem(REACT_SCAN_ENABLED_KEY, 'true');
      return true;
    }
  } catch {
    // Ignore malformed legacy options.
  }

  return false;
}

export function setReactScanEnabled(enabled: boolean): void {
  if (isReactScanDisabled()) {
    return;
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(REACT_SCAN_ENABLED_KEY, enabled ? 'true' : 'false');
  }

  const options = buildReactScanOptions(enabled);

  if (enabled) {
    scan(options);
    return;
  }

  setOptions({ enabled: false, showToolbar: false });

  try {
    const legacyKey = 'react-scan-options';
    const legacyOptions = JSON.parse(
      localStorage.getItem(legacyKey) || '{}',
    ) as ReactScanRuntimeOptions;
    localStorage.setItem(
      legacyKey,
      JSON.stringify({ ...legacyOptions, enabled: false, showToolbar: false }),
    );
  } catch {
    // Ignore malformed legacy options.
  }
}

export function initReactScanIfEnabled(): void {
  if (isReactScanDisabled() || !getReactScanEnabled()) {
    return;
  }

  scan(buildReactScanOptions(true));
}
