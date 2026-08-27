/**
 * Minimal typing + loader for Jitsi's IFrame External API
 * (https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/).
 * Not published as an npm package — it's a <script> that defines a global
 * `JitsiMeetExternalAPI` constructor, loaded from the SAME self-hosted domain
 * video-service issues join tokens for (never the public meet.jit.si — this
 * platform runs its own Prosody server with JWT auth, see security/jitsiToken.ts
 * in video-service).
 */

export interface JitsiMeetExternalAPIOptions {
  roomName: string;
  parentNode: HTMLElement;
  width?: string | number;
  height?: string | number;
  jwt?: string;
  userInfo?: { displayName?: string; email?: string };
  configOverwrite?: Record<string, unknown>;
  interfaceConfigOverwrite?: Record<string, unknown>;
}

export interface JitsiMeetExternalAPI {
  addListener(event: string, listener: (...args: unknown[]) => void): void;
  removeListener(event: string, listener: (...args: unknown[]) => void): void;
  executeCommand(command: string, ...args: unknown[]): void;
  isAudioMuted(): Promise<boolean>;
  isVideoMuted(): Promise<boolean>;
  dispose(): void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: JitsiMeetExternalAPIOptions) => JitsiMeetExternalAPI;
  }
}

const loadedScripts = new Map<string, Promise<void>>();

/** Loads https://{domain}/external_api.js once per domain, cached across calls. */
export function loadJitsiExternalApi(domain: string): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();

  const existing = loadedScripts.get(domain);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load Jitsi External API from ${domain}`));
    document.head.appendChild(script);
  });

  loadedScripts.set(domain, promise);
  return promise;
}
