import { ShieldCheck } from 'lucide-react';

export function ComplianceCard() {
  return (
    <div className="flex items-center gap-4 rounded-[14px] border border-rule bg-surface p-5 shadow-[0_1px_2px_0_rgba(28,24,18,.04)]">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-action-light text-action-dark">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-semibold text-ink">Compliance up-to-date</div>
        <div className="mt-0.5 text-xs text-muted-text">HIPAA · SOC 2 · DPDP Act · WHO mhGAP</div>
      </div>
    </div>
  );
}
