import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import type { TherapistMe, UpdateTherapistCoreRequest } from '../../api/therapistProfile';
import type { useAccountSecurity } from './useAccountSecurity';
import {
  normalizeTotpCode,
  validateNewPassword,
  verificationStatusLabel,
  verificationIsApproved,
} from './settingsHelpers';
import { SettingsField, SettingsSectionHeader, settingsInputClass } from './settingsUi';

interface AccountTabProps {
  profile: TherapistMe | null;
  loading: boolean;
  saving: boolean;
  onSave: (patch: UpdateTherapistCoreRequest) => Promise<boolean>;
  security: ReturnType<typeof useAccountSecurity>;
}

export function AccountTab({ profile, loading, saving, onSave, security }: AccountTabProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? '');
    setLastName(profile.last_name ?? '');
    setPhone(profile.phone ?? '');
  }, [profile]);

  const nestedProfile = profile?.therapist_profile;
  const dirty =
    !!profile &&
    (firstName !== (profile.first_name ?? '') ||
      lastName !== (profile.last_name ?? '') ||
      phone !== (profile.phone ?? ''));

  async function handleSave() {
    await onSave({ firstName, lastName, phone });
  }

  async function handleVerifyMfa() {
    const code = normalizeTotpCode(mfaCode);
    if (!code) {
      toast.error('Enter the 6-digit code from your authenticator app.');
      return;
    }
    try {
      const verified = await security.confirmMfaSetup(code);
      if (verified) {
        toast.success('Two-factor authentication is on.');
        setMfaCode('');
      } else {
        toast.error('That code didn’t verify — check your authenticator app and try again.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not verify that code');
    }
  }

  if (loading) return <div className="py-10 text-center text-sm text-muted-text">Loading…</div>;

  return (
    <>
      <SettingsSectionHeader title="Profile & security" description="Your public profile and sign-in details" />

      <div className="grid grid-cols-2 gap-4">
        <SettingsField label="First name">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={settingsInputClass}
          />
        </SettingsField>
        <SettingsField label="Last name">
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={settingsInputClass}
          />
        </SettingsField>
        <SettingsField label="Email" hint="Contact support to change the email on your account.">
          <input value={profile?.email ?? ''} disabled className={settingsInputClass} />
        </SettingsField>
        <SettingsField label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={settingsInputClass} />
        </SettingsField>
        <SettingsField label="Title" hint="Derived from your clinical specialties — not directly editable here.">
          <input value={nestedProfile?.title ?? 'Therapist'} disabled className={settingsInputClass} />
        </SettingsField>
        <SettingsField
          label="RCI registration"
          hint={
            verificationIsApproved(nestedProfile?.verification_status)
              ? 'Locked while your credentials are verified. Contact support to request a change.'
              : 'Managed as part of credential verification, not from Settings.'
          }
        >
          <input value={nestedProfile?.license_number ?? 'Not submitted'} disabled className={settingsInputClass} />
        </SettingsField>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-text">
        Verification status:
        <span className="rounded-full bg-action-light px-2.5 py-1 font-semibold text-action-dark">
          {verificationStatusLabel(nestedProfile?.verification_status)}
        </span>
      </div>

      <div className="mt-6 flex justify-end">
        <Button size="sm" className="h-10 px-4 text-sm" disabled={!dirty || saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      <div className="mt-8 border-t border-rule pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-rule bg-canvas px-4 py-3.5">
          <div>
            <div className="text-[13px] font-semibold text-ink">Password</div>
            <div className="mt-0.5 text-xs text-muted-text">Change your sign-in password.</div>
          </div>
          <Button variant="outline" size="sm" className="h-9 text-[13px]" onClick={() => setPasswordOpen(true)}>
            Change password
          </Button>
        </div>

        <div className="mt-3 rounded-[10px] border border-rule bg-canvas px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-semibold text-ink">Two-factor authentication</div>
              <div className="mt-0.5 text-xs text-muted-text">
                {security.mfaLoading
                  ? 'Checking status…'
                  : security.mfaEnabled
                    ? 'On — an authenticator app code is required at sign-in.'
                    : 'Off — add an authenticator app for a second sign-in check.'}
              </div>
            </div>
            {!security.mfaLoading && security.mfaEnabled && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-[13px] text-[#8E4848] hover:bg-[#F4E3E3] hover:text-[#8E4848]"
                disabled={security.mfaBusy}
                onClick={async () => {
                  try {
                    await security.turnOffMfa();
                    toast.success('Two-factor authentication is off.');
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Could not turn off 2FA');
                  }
                }}
              >
                Turn off
              </Button>
            )}
            {!security.mfaLoading && !security.mfaEnabled && !security.pendingSecret && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-[13px]"
                disabled={security.mfaBusy}
                onClick={async () => {
                  try {
                    await security.beginMfaSetup();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Could not start 2FA setup');
                  }
                }}
              >
                Enable 2FA
              </Button>
            )}
          </div>

          {security.pendingSecret && (
            <div className="mt-3.5 border-t border-rule pt-3.5">
              <p className="text-xs text-muted-text">
                Add this key to an authenticator app (Google Authenticator, Authy, 1Password), then enter the 6-digit
                code it shows.
              </p>
              <div className="mt-2 break-all rounded-lg bg-surface-warm px-3 py-2 font-mono text-xs text-ink">
                {security.pendingSecret}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="123456"
                  inputMode="numeric"
                  className={`${settingsInputClass} max-w-[160px]`}
                />
                <Button size="sm" className="h-[42px] text-[13px]" disabled={security.mfaBusy} onClick={handleVerifyMfa}>
                  Verify & enable
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-[42px] text-[13px]"
                  onClick={() => {
                    security.cancelMfaSetup();
                    setMfaCode('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} security={security} />
    </>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
  security,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  security: ReturnType<typeof useAccountSecurity>;
}) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  function reset() {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  async function handleSubmit() {
    const validationError = validateNewPassword(newPassword, confirmPassword);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await security.changePassword(oldPassword, newPassword);
      toast.success('Password changed.');
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change your password');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>You'll stay signed in on this device.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <SettingsField label="Current password">
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className={settingsInputClass}
            />
          </SettingsField>
          <SettingsField label="New password">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              className={settingsInputClass}
            />
          </SettingsField>
          <SettingsField label="Confirm new password">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              className={settingsInputClass}
            />
          </SettingsField>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-10 text-sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" className="h-10 text-sm" disabled={security.passwordBusy} onClick={handleSubmit}>
            {security.passwordBusy ? 'Changing…' : 'Change password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
