/**
 * SettingsPage — real Account/Availability/Services/Notifications/Compliance
 * tabs, replacing the placeholder. See per-tab components in ./settings/ for
 * exactly which fields are real (wired to a backend-initial/billing_payment
 * route) vs. an honest static/gap state — each tab's module documents its
 * own backend evidence.
 *
 * Permission gating: per App.tsx's route comment (pre-existing, guarding
 * this exact moment), a sub-feature that maps to one of AppSidebar's
 * `settings:*` permissions (team_members/payroll/online_payments/plan_info/
 * demo_client) must check `useOrgContext`'s `hasPermission` before calling
 * its backend. None of the five tabs built here are that — Account,
 * Availability, Services and Notification preferences are the caller's own
 * data (every therapist may edit their own profile regardless of org role),
 * and Compliance is read-only. So no permission gate is added for these five;
 * the next session that builds a team_members/payroll/plan_info tab must add
 * one for THAT tab specifically, not loosen this comment.
 */
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { useSettingsProfile } from './settings/useSettingsProfile';
import { useNotificationSettings } from './settings/useNotificationSettings';
import { useAccountSecurity } from './settings/useAccountSecurity';
import { useComplianceStatus } from './settings/useComplianceStatus';
import { AccountTab } from './settings/AccountTab';
import { AvailabilityTab } from './settings/AvailabilityTab';
import { ServicesTab } from './settings/ServicesTab';
import { NotificationsTab } from './settings/NotificationsTab';
import { ComplianceTab } from './settings/ComplianceTab';

export const SETTINGS_TABS = [
  { id: 'account', label: 'Profile & security' },
  { id: 'availability', label: 'Calendar & availability' },
  { id: 'services', label: 'Services' },
  { id: 'notifications-settings', label: 'Notification preferences' },
  { id: 'insurance', label: 'Payment & compliance' },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]['id'];

export function resolveSettingsTab(section: string | undefined): SettingsTabId {
  return SETTINGS_TABS.some((t) => t.id === section) ? (section as SettingsTabId) : 'account';
}

export default function SettingsPage() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const activeTab = resolveSettingsTab(section);

  const profileState = useSettingsProfile();
  const notifState = useNotificationSettings();
  const security = useAccountSecurity();
  const complianceState = useComplianceStatus();

  // Keep the URL canonical — /settings alone resolves to the account tab
  // without a redirect flash, but an unknown :section corrects itself.
  useEffect(() => {
    if (section && section !== activeTab) {
      navigate(`/settings/${activeTab}`, { replace: true });
    }
  }, [section, activeTab, navigate]);

  const errorBanner = useMemo(() => {
    const err = profileState.error || notifState.error || complianceState.error;
    return err ?? null;
  }, [profileState.error, notifState.error, complianceState.error]);

  return (
    <>
      <PageHeader title="Settings" />
      <main className="flex-1 overflow-y-auto p-7">
        <div className="mx-auto grid max-w-[1000px] grid-cols-[240px_1fr] gap-6">
          <nav className="flex flex-col gap-0.5">
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate(`/settings/${tab.id}`)}
                className={`rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-action-light text-action-dark'
                    : 'text-body-text hover:bg-action-light/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="rounded-[14px] border border-rule bg-surface p-6">
            {errorBanner && (
              <div className="mb-5 rounded-lg border border-[#E5C6C6] bg-[#FBEFEF] px-4 py-2.5 text-sm text-[#8E4848]">
                {errorBanner}
              </div>
            )}

            {activeTab === 'account' && (
              <AccountTab
                profile={profileState.profile}
                loading={profileState.loading}
                saving={profileState.savingCore}
                onSave={profileState.saveCore}
                security={security}
              />
            )}

            {activeTab === 'availability' && (
              <AvailabilityTab
                profile={profileState.profile}
                loading={profileState.loading}
                saving={profileState.savingProfile}
                onSave={profileState.saveProfileFields}
              />
            )}

            {activeTab === 'services' && (
              <ServicesTab
                profile={profileState.profile}
                loading={profileState.loading}
                saving={profileState.savingProfile}
                onSave={profileState.saveProfileFields}
              />
            )}

            {activeTab === 'notifications-settings' && (
              <NotificationsTab
                prefs={notifState.prefs}
                loading={notifState.loading}
                saving={notifState.saving}
                onToggle={notifState.toggle}
              />
            )}

            {activeTab === 'insurance' && (
              <ComplianceTab
                profile={profileState.profile}
                bankDetails={complianceState.bankDetails}
                loading={profileState.loading}
                bankLoading={complianceState.loading}
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
