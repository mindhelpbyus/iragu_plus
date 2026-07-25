import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  children?: ReactNode;
}

/** Sticky 64px top bar rendered by each page — title left, optional slot (search/actions) right/center. */
export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="relative flex h-16 flex-shrink-0 items-center border-b border-rule bg-surface px-7">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
      {children}
    </header>
  );
}
