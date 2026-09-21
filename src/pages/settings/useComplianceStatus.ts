import { useCallback, useEffect, useState } from 'react';
import { getBankDetails, type BankDetails } from '../../api/billing';

/**
 * Read-only compliance status for Settings — reuses the exact same
 * billing_payment call PayoutsPage already makes (GET
 * /api/therapists/me/bank-details) rather than adding a second bank-account
 * client. Editing bank details is NOT built here — see SettingsPage's module
 * doc for why (sensitive PII with its own validate/cooldown state machine
 * that belongs on Payouts, not duplicated into a generic settings form).
 */
export function useComplianceStatus() {
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBankDetails(await getBankDetails());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payout account status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { bankDetails, loading, error };
}
