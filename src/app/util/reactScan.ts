const REACT_SCAN_ENABLED_KEY = 'nfcReactScanEnabled';

export interface ReactScanRuntimeOptions {
  enabled?: boolean;
  showToolbar?: boolean;
  log?: boolean;
  trackUnnecessaryRenders?: boolean;
  animationSpeed?: 'slow' | 'fast' | 'off';
  dangerouslyForceRunInProduction?: boolean;
}

type ReactScanModule = typeof import('react-scan');

let reactScanModule: ReactScanModule | null = null;
let reactScanLoadPromise: Promise<ReactScanModule> | null = null;

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

async function loadReactScanModule(): Promise<ReactScanModule> {
  if (reactScanModule) {
    return reactScanModule;
  }

  if (!reactScanLoadPromise) {
    reactScanLoadPromise = import('react-scan').then(module => {
      reactScanModule = module;
      return module;
    });
  }

  return reactScanLoadPromise;
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

export async function setReactScanEnabled(enabled: boolean): Promise<void> {
  if (isReactScanDisabled()) {
    return;
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(REACT_SCAN_ENABLED_KEY, enabled ? 'true' : 'false');
  }

  const options = buildReactScanOptions(enabled);

  if (enabled) {
    const { scan } = await loadReactScanModule();
    scan(options);
    return;
  }

  if (reactScanModule) {
    reactScanModule.setOptions({ enabled: false, showToolbar: false });
  }

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

export async function initReactScanIfEnabled(): Promise<void> {
  if (isReactScanDisabled() || !getReactScanEnabled()) {
    return;
  }

  const { scan } = await loadReactScanModule();
  scan(buildReactScanOptions(true));
}
