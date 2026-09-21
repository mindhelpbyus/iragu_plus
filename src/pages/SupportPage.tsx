/**
 * SupportPage — real static contact info + real `mailto:` actions, not a
 * fake ticket system.
 *
 * A real support-ticket backend exists (`Ticket`/`TicketMessage`/
 * `TicketAttachment` models in backend-initial/prisma/schema.prisma), but it
 * is owned and served by `backend_support_api`, a standalone peer service
 * that is not checked out in this workspace and has no base URL configured
 * anywhere in iragu_plus (grep confirms nothing in this repo points at it).
 * Building a "Submit ticket" form against a backend this app cannot reach
 * would either silently fail or need a fabricated success toast — both
 * dishonest. The client-side sibling app made the identical call for the
 * identical reason (backend-initial/docs/specs/iragu-client-web-app/
 * requirements.md row 11: "Static content, no backend required for MVP"),
 * and iragu_plus/docs/design-gap-checklist.md already flagged this page the
 * same way before this change. `mailto:` links are real — they hand off to
 * the user's own mail client, no fake backend call involved.
 *
 * support@iragu.com is the same address backend-initial's own transactional
 * emails and error copy already point therapists to (see
 * shared/notifications/email-layout.ts's SUPPORT_EMAIL and the therapist
 * account-deletion 403 message) — not invented for this page.
 */
import { CreditCard, Video, CircleHelp, Mail } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { buildSupportMailto } from './settings/settingsHelpers';

export const SUPPORT_EMAIL = 'support@iragu.com';

export const SUPPORT_CATEGORIES = [
  { id: 'billing', label: 'Payout / billing issue', subject: 'Payout / billing issue', icon: CreditCard },
  { id: 'telehealth', label: 'Telehealth / tech issue', subject: 'Telehealth / tech issue', icon: Video },
  { id: 'other', label: 'Something else', subject: 'Support request', icon: CircleHelp },
] as const;

export default function SupportPage() {
  return (
    <>
      <PageHeader title="Help & Support" />
      <main className="flex-1 overflow-y-auto p-7">
        <div className="mx-auto max-w-[820px]">
          <h2 className="text-[28px] font-medium tracking-tight text-ink">Help & Support</h2>
          <p className="mt-1 mb-6 text-sm text-muted-text">
            Product and account issues for your practice on Iragu+.
          </p>

          <div className="grid grid-cols-3 gap-3.5">
            {SUPPORT_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <a
                  key={cat.id}
                  href={buildSupportMailto(cat.subject, SUPPORT_EMAIL)}
                  className="rounded-xl border border-rule bg-surface p-4 transition-colors hover:border-action"
                >
                  <Icon className="h-[18px] w-[18px] text-action-dark" />
                  <div className="mt-2 text-[13px] font-semibold text-ink">{cat.label}</div>
                </a>
              );
            })}
          </div>

          <div className="mt-6 rounded-[14px] border border-rule bg-surface p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-action-light text-action-dark">
                <Mail className="h-[18px] w-[18px]" />
              </span>
              <div>
                <div className="text-[15px] font-semibold text-ink">Email us</div>
                <a href={buildSupportMailto('Support request', SUPPORT_EMAIL)} className="text-sm text-action-dark hover:underline">
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-text">
              We don't have in-app ticket tracking yet — replies come back to your email, not to a list on this
              page.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
