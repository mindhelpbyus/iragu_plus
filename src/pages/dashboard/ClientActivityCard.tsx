import { CLIENT_ACTIVITY, initialsOf } from './mockData';

export function ClientActivityCard() {
  return (
    <div className="rounded-[14px] border border-rule bg-surface p-5 shadow-[0_1px_2px_0_rgba(28,24,18,.04)]">
      <h3 className="mb-2 text-[17px] font-semibold text-ink">Client activity</h3>
      <div className="flex flex-col">
        {CLIENT_ACTIVITY.map((item, i) => (
          <div
            key={item.name + item.time}
            className={`flex items-center gap-3 py-2.5 ${i < CLIENT_ACTIVITY.length - 1 ? 'border-b border-action-light' : ''}`}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-action-light text-xs font-semibold text-action-dark">
              {initialsOf(item.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-ink">{item.name}</div>
              <div className="truncate text-xs text-muted-text">{item.activity}</div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              <span className="text-[11px] text-muted-text">{item.time}</span>
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: item.dot ?? 'transparent' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
