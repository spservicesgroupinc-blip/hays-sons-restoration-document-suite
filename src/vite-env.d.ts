/// <reference types="vite/client" />

/**
 * Build-time configuration.
 *
 * Anything prefixed with VITE_ is inlined into the client bundle at build time
 * and is therefore public. Never put a secret in one of these.
 */
interface ImportMetaEnv {
  /** Deployed Google Apps Script Web App URL, used as the default database backend. */
  readonly VITE_APPS_SCRIPT_URL?: string;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
