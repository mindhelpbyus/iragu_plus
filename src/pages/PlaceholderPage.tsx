/**
 * Temporary stand-in for screens not yet built. Every route in App.tsx renders
 * a real page — this just marks which ones are still pending so the route
 * tree, layout, and navigation can be exercised end-to-end before every
 * screen's real content exists.
 */
import { PageHeader } from '../components/layout/PageHeader';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <main className="flex flex-1 flex-col items-center justify-center gap-2 overflow-y-auto text-center">
        <p className="text-sm text-muted-text">This screen hasn't been built yet.</p>
      </main>
    </>
  );
}
