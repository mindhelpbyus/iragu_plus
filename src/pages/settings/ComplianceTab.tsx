import { Link } from 'react-router-dom';
import type { TherapistMe } from '../../api/therapistProfile';
import type { BankDetails } from '../../api/billing';
import { verificationStatusLabel } from './settingsHelpers';
import { GapNotice, SettingsSectionHeader } from './settingsUi';

interface ComplianceTabProps {
  profile: TherapistMe | null;
  bankDetails: BankDetails | null;
  loading: boolean;
  bankLoading: boolean;
}

function CheckRow({ label, value, tone }: { label: string; value: string; tone: 'ok' | 'pending' | 'unknown' }) {
  const dot = tone === 'ok' ? 'bg-action' : tone === 'pending' ? 'bg-ochre' : 'bg-dim';
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-rule px-3.5 py-3">
      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dot}`} />
      <span className="flex-1 text-[13px] text-ink">{label}</span>
      <span className="text-xs text-muted-text">{value}</span>
    </div>
  );
}

export function ComplianceTab({ profile, bankDetails, loading, bankLoading }: ComplianceTabProps) {
  const nested = profile?.therapist_profile;

  return (
    <>
      <SettingsSectionHeader
        title="Payment & compliance"
        description="Payout account and credential verification status — read-only here; manage the payout account itself from Payouts."
      />

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-text">Loading…</div>
      ) : (
        <div className="flex flex-col gap-2">
          <CheckRow
            label="RCI registration"
            value={verificationStatusLabel(nested?.verification_status)}
            tone={nested?.verification_status === 'approved' ? 'ok' : 'pending'}
          />
          {bankLoading ? (
            <div className="rounded-[10px] border border-rule px-3.5 py-3 text-xs text-muted-text">
              Loading payout account status…
            </div>
          ) : (
            <CheckRow
              label={
                bankDetails?.active
                  ? `Payout account${bankDetails.account_last_4 ? ` ····${bankDetails.account_last_4}` : ''}`
                  : 'Payout account'
              }
              value={
                bankDetails?.active
                  ? bankDetails.bank_verified
                    ? 'Verified'
                    : bankDetails.verification_status
                  : 'Not on file'
              }
              tone={bankDetails?.bank_verified ? 'ok' : bankDetails?.active ? 'pending' : 'unknown'}
            />
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-muted-text">
        To add or update your payout bank account, go to{' '}
        <Link to="/payments" className="font-medium text-action-dark hover:underline">
          Payouts
        </Link>
        .
      </p>

      <div className="mt-8 border-t border-rule pt-6">
        <GapNotice title="HIPAA / DPDP training completion">
          Not tracked anywhere in backend-initial today — no field, no route. Showing a completion date here (as the
          design mock does) would be fabricated, so this row is left out until there's a real training-tracking
          backend.
        </GapNotice>
      </div>
    </>
  );
}
