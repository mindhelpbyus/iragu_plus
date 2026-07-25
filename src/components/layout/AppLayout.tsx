import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';

/**
 * Persistent chrome (sidebar) around every authenticated route. Each page owns
 * its own <PageHeader> and content padding — this wrapper only provides the
 * scrollable column, so pages stay self-contained instead of sharing a header.
 */
export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
