import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Inbox,
  FileText,
  CheckSquare,
  MessageSquare,
  Video,
  Bell,
  Wallet,
  Receipt,
  Banknote,
  Layers,
  BarChart3,
  Activity,
  Sparkles,
  HelpCircle,
  ChevronLeft,
  Search,
  LogOut,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { roleLabel } from '../../lib/roles';
import iraguPlusMark from '../../assets/brand/iragu-plus-mark.svg';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** TODO: replace with real counts from backend-initial once /calendar and /clients list endpoints are wired here. */
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    label: 'Practice',
    items: [
      { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
      { to: '/calendar', label: 'Calendar', icon: Calendar, badge: 6 },
      { to: '/clients', label: 'Clients', icon: Users, badge: 124 },
      { to: '/requests', label: 'Requests', icon: Inbox },
    ],
  },
  {
    label: 'Clinical',
    items: [
      { to: '/notes', label: 'Notes', icon: FileText },
      { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    ],
  },
  {
    label: 'Communication',
    items: [
      { to: '/messages', label: 'Messages', icon: MessageSquare },
      { to: '/telehealth', label: 'Telehealth', icon: Video },
      { to: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/billing', label: 'Earnings', icon: Wallet },
      { to: '/invoices', label: 'Statements', icon: Receipt },
      { to: '/payments', label: 'Payouts', icon: Banknote },
      { to: '/plans', label: 'Plans', icon: Layers },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/activity', label: 'Activity', icon: Activity },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const FOOTER_ITEMS: NavItem[] = [
  { to: '/assistant', label: 'AI Assistant', icon: Sparkles },
  { to: '/support', label: 'Help & Support', icon: HelpCircle },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const initials = (user?.name ?? 'Therapist')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className="flex h-screen flex-shrink-0 flex-col border-r border-rule bg-surface transition-[width] duration-200"
      style={{ width: collapsed ? '76px' : '264px' }}
    >
      <div className="flex h-16 flex-shrink-0 items-center gap-2.5 px-4">
        <img src={iraguPlusMark} alt="" className="h-[30px] w-[30px] flex-shrink-0" />
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <div className="whitespace-nowrap text-base font-semibold leading-tight tracking-tight text-ink">
                Iragu+
              </div>
              <div className="w-[129px] whitespace-nowrap text-[9px] font-semibold uppercase leading-[8px] tracking-[0.18em] text-action">
                Therapist Business
              </div>
            </div>
            <div className="flex flex-shrink-0 gap-0.5">
              <button
                type="button"
                title="Search"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-text transition-colors hover:bg-action-light/60"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Notifications"
                className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-text transition-colors hover:bg-action-light/60"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-0.5 top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border border-surface bg-[#B06060] px-[3px] text-[9px] font-bold text-white">
                  3
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="mx-2.5 mb-2 flex h-[34px] items-center gap-2 rounded-lg border border-action-border bg-action-light px-2.5 text-xs font-semibold text-action-dark transition-colors hover:bg-action-light/70"
        style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
      >
        <ChevronLeft
          className="h-[15px] w-[15px] flex-shrink-0 transition-transform duration-200"
          style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
        {!collapsed && <span>Collapse</span>}
      </button>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-3.5 pb-4">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-text">
                {section.label}
              </div>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                  `flex h-[34px] items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-action-light text-action-dark'
                      : 'text-body-text hover:bg-action-light/60 hover:text-action-dark'
                  }`
                }
                style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
              >
                <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="mr-auto truncate">{item.label}</span>
                    {item.badge != null && (
                      <span className="rounded-full bg-action-light px-[7px] py-[2px] text-[11px] text-muted-text">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-rule px-3.5 py-3">
        {FOOTER_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) =>
              `flex h-[38px] items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-action-light text-action-dark'
                  : 'text-body-text hover:bg-action-light/60 hover:text-action-dark'
              }`
            }
            style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
        <div className="mt-1 flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-action-light text-xs font-semibold text-action-dark">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-ink">{user?.name ?? 'Therapist'}</div>
              <div className="truncate text-[11px] text-muted-text">{roleLabel(user?.role)}</div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-text transition-colors hover:bg-action-light/60 hover:text-action-dark"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
