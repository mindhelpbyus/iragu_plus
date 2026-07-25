import { useEffect, useState } from 'react';
import { HOUR_PX } from './calendarConstants';

function nowTop() {
  const now = new Date();
  return ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_PX;
}

/** Live "now" indicator — computed from the real clock (the prototype hardcodes top:923px instead). */
export function NowLine({ withLabel = false }: { withLabel?: boolean }) {
  const [top, setTop] = useState(nowTop());

  useEffect(() => {
    const id = setInterval(() => setTop(nowTop()), 60_000);
    return () => clearInterval(id);
  }, []);

  const label = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="absolute left-0 right-0 z-[2] border-t-2 border-action" style={{ top }}>
      <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-action" />
      {withLabel && (
        <span className="absolute -top-[9px] right-2 rounded-full bg-action px-2 py-0.5 text-[10px] font-semibold text-white">
          NOW · {label}
        </span>
      )}
    </div>
  );
}
