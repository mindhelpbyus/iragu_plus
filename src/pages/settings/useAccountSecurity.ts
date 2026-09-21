import { useCallback, useEffect, useState } from 'react';
import {
  changeUserPassword,
  disableMFA,
  getMFAStatus,
  setupMFA,
  verifyMFA,
} from '../../api/auth';

/**
 * Password change + TOTP MFA — both wrap real, already-implemented Cognito
 * calls in api/auth.ts (setupMFA/verifyMFA/disableMFA/getMFAStatus/
 * changeUserPassword) that had zero UI call sites anywhere in this app before
 * this page. Settings' Account tab is the first real caller.
 */
export function useAccountSecurity() {
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [pendingSecret, setPendingSecret] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const loadMfaStatus = useCallback(async () => {
    setMfaLoading(true);
    try {
      const status = await getMFAStatus();
      setMfaEnabled(status.enabled);
    } catch {
      // Non-fatal — the account tab still works without this readout.
      setMfaEnabled(null);
    } finally {
      setMfaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMfaStatus();
  }, [loadMfaStatus]);

  async function beginMfaSetup(): Promise<{ secret: string } | null> {
    setMfaBusy(true);
    try {
      const { secret } = await setupMFA();
      setPendingSecret(secret);
      return { secret };
    } catch (err) {
      throw err instanceof Error ? err : new Error('Could not start 2FA setup');
    } finally {
      setMfaBusy(false);
    }
  }

  async function confirmMfaSetup(code: string): Promise<boolean> {
    setMfaBusy(true);
    try {
      const { verified } = await verifyMFA(code);
      if (verified) {
        setMfaEnabled(true);
        setPendingSecret(null);
      }
      return verified;
    } finally {
      setMfaBusy(false);
    }
  }

  function cancelMfaSetup() {
    setPendingSecret(null);
  }

  async function turnOffMfa(): Promise<void> {
    setMfaBusy(true);
    try {
      await disableMFA();
      setMfaEnabled(false);
    } finally {
      setMfaBusy(false);
    }
  }

  async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
    setPasswordBusy(true);
    try {
      await changeUserPassword(oldPassword, newPassword);
    } finally {
      setPasswordBusy(false);
    }
  }

  return {
    mfaEnabled,
    mfaLoading,
    mfaBusy,
    pendingSecret,
    beginMfaSetup,
    confirmMfaSetup,
    cancelMfaSetup,
    turnOffMfa,
    passwordBusy,
    changePassword,
  };
}
