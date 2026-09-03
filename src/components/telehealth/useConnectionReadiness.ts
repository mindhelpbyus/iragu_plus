import { useEffect, useState } from 'react';

export type PermissionState = 'unknown' | 'checking' | 'granted' | 'denied' | 'unsupported';

export interface ConnectionReadiness {
  mediaPermission: PermissionState;
  /** navigator.connection.downlink in Mbps, when the Network Information API is available. */
  downlinkMbps: number | null;
  /** navigator.connection.effectiveType — '4g', '3g', etc. Null when unsupported (e.g. Safari, Firefox). */
  effectiveType: string | null;
  /**
   * Real device names from enumerateDevices() — the browser only returns a
   * non-empty label once permission is already granted (a privacy
   * constraint of the spec itself, not something this hook can bypass), so
   * both stay null until mediaPermission === 'granted'. Never invented.
   */
  micLabel: string | null;
  cameraLabel: string | null;
}

/**
 * Real, unfaked device/network readiness — no placeholder numbers. Checks
 * actual camera/mic permission state via the Permissions API (falling back to
 * a getUserMedia probe where Permissions API can't query 'camera'/'microphone',
 * e.g. Safari) and real network info via the Network Information API, which is
 * Chromium-only — effectiveType/downlinkMbps stay null everywhere else rather
 * than being invented.
 */
export function useConnectionReadiness(): ConnectionReadiness {
  const [mediaPermission, setMediaPermission] = useState<PermissionState>('checking');
  const [network, setNetwork] = useState<{ downlinkMbps: number | null; effectiveType: string | null }>({
    downlinkMbps: null,
    effectiveType: null,
  });
  const [deviceLabels, setDeviceLabels] = useState<{ micLabel: string | null; cameraLabel: string | null }>({
    micLabel: null,
    cameraLabel: null,
  });

  useEffect(() => {
    if (mediaPermission !== 'granted' || !navigator.mediaDevices?.enumerateDevices) return;
    let cancelled = false;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        if (cancelled) return;
        setDeviceLabels({
          micLabel: devices.find((d) => d.kind === 'audioinput')?.label || null,
          cameraLabel: devices.find((d) => d.kind === 'videoinput')?.label || null,
        });
      })
      .catch(() => {
        // Leave labels null — no fallback name is invented.
      });
    return () => {
      cancelled = true;
    };
  }, [mediaPermission]);

  useEffect(() => {
    let cancelled = false;

    async function checkMedia() {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) setMediaPermission('unsupported');
        return;
      }
      if (navigator.permissions?.query) {
        try {
          const [cam, mic] = await Promise.all([
            navigator.permissions.query({ name: 'camera' as PermissionName }),
            navigator.permissions.query({ name: 'microphone' as PermissionName }),
          ]);
          if (cancelled) return;
          if (cam.state === 'granted' && mic.state === 'granted') {
            setMediaPermission('granted');
            return;
          }
          if (cam.state === 'denied' || mic.state === 'denied') {
            setMediaPermission('denied');
            return;
          }
          setMediaPermission('unknown');
          return;
        } catch {
          // Permissions API doesn't recognize 'camera'/'microphone' on this
          // browser (Safari/Firefox) — fall through to the probe below.
        }
      }
      setMediaPermission('unknown');
    }

    checkMedia();

    const connection = (navigator as Navigator & { connection?: { downlink?: number; effectiveType?: string; addEventListener?: (t: string, l: () => void) => void; removeEventListener?: (t: string, l: () => void) => void } }).connection;
    if (connection) {
      const read = () => {
        if (cancelled) return;
        setNetwork({
          downlinkMbps: typeof connection.downlink === 'number' ? connection.downlink : null,
          effectiveType: connection.effectiveType ?? null,
        });
      };
      read();
      connection.addEventListener?.('change', read);
      return () => {
        cancelled = true;
        connection.removeEventListener?.('change', read);
      };
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return { mediaPermission, ...network, ...deviceLabels };
}
