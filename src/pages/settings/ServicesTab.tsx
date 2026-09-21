import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import type { TherapistMe } from '../../api/therapistProfile';
import { paiseToRupeesInput, rupeesToPaise } from './settingsHelpers';
import { GapNotice, SettingsField, SettingsSectionHeader, settingsInputClass, settingsSelectClass } from './settingsUi';

interface ServicesTabProps {
  profile: TherapistMe | null;
  loading: boolean;
  saving: boolean;
  onSave: (patch: { sessionFees?: number; sessionType?: 'online' | 'in-person' | 'both' }) => Promise<boolean>;
}

export function ServicesTab({ profile, loading, saving, onSave }: ServicesTabProps) {
  const [fee, setFee] = useState('');
  const [sessionType, setSessionType] = useState<'online' | 'in-person' | 'both'>('online');

  useEffect(() => {
    const nested = profile?.therapist_profile;
    setFee(paiseToRupeesInput(nested?.session_fees));
    const st = nested?.session_type;
    setSessionType(st === 'online' || st === 'in-person' || st === 'both' ? st : 'online');
  }, [profile]);

  async function handleSave() {
    const paise = rupeesToPaise(fee);
    if (paise === null) {
      toast.error('Enter a valid session fee (e.g. 2500).');
      return;
    }
    await onSave({ sessionFees: paise, sessionType });
  }

  if (loading) return <div className="py-10 text-center text-sm text-muted-text">Loading…</div>;

  return (
    <>
      <SettingsSectionHeader
        title="Services & fees"
        description="What you offer and what a session costs — Iragu+ deducts its commission automatically"
      />

      <div className="grid grid-cols-2 gap-4">
        <SettingsField label="Session fee (₹)" hint="Your default fee, before the platform commission.">
          <input
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            inputMode="decimal"
            placeholder="2500"
            className={settingsInputClass}
          />
        </SettingsField>
        <SettingsField label="Session format">
          <select
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value as typeof sessionType)}
            className={settingsSelectClass}
          >
            <option value="online">Online only</option>
            <option value="in-person">In-person only</option>
            <option value="both">Online & in-person</option>
          </select>
        </SettingsField>
      </div>

      <div className="mt-6 flex justify-end">
        <Button size="sm" className="h-10 px-4 text-sm" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      <div className="mt-8 border-t border-rule pt-6">
        <GapNotice title="Per-service pricing (individual / couples / group / intake)">
          Only a single default session fee is real today. A per-service-type catalog with its own duration and fee
          per type (as shown in the design) has no live backend — the <code>consultation-services</code> Lambda in
          backend-initial exists only as stale build output with no source and no API Gateway route, and the
          <code>TherapistServicesService</code> helper that would back a catalog is never called from any handler.
          Building that catalog needs a real backend-initial spec (a new lambda route, or wiring the existing dead
          service), not a frontend-only fix.
        </GapNotice>
      </div>
    </>
  );
}
