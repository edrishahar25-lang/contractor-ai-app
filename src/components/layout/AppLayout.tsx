import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  PlusCircle,
  Tag,
  Settings,
  Menu,
  X,
  HardHat,
  Camera,
  Map,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'דשבורד', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'הצעות מחיר', icon: FolderOpen, end: false },
  { to: '/project/new', label: 'פרויקט חדש', icon: PlusCircle, end: false },
  { to: '/pricing', label: 'מחירון', icon: Tag, end: false },
  { to: '/settings', label: 'הגדרות', icon: Settings, end: false },
];

const SECONDARY_NAV = [
  { to: '/photos', label: 'תמונות', icon: Camera, badge: 'בקרוב' },
  { to: '/blueprint', label: 'תוכניות', icon: Map, badge: 'בקרוב' },
];

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (to: string, end: boolean) =>
    end ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Desktop Sidebar ─────────────────── */}
      <aside className="no-print hidden lg:flex flex-col fixed right-0 top-0 bottom-0 w-60 bg-slate-900 z-40">
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 px-5 py-5 border-b border-white/10 hover:bg-white/5 transition-colors w-full text-right"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <HardHat size={20} className="text-amber-400" />
          </div>
          <div>
            <div className="text-white font-extrabold text-sm leading-tight">
              Contractor AI Pro
            </div>
            <div className="text-white/40 text-xs font-normal">
              מערכת הצעות מחיר
            </div>
          </div>
        </button>

        {/* Main nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.end);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${active
                    ? 'bg-amber-500/18 text-amber-400 [background:rgba(201,162,39,0.18)]'
                    : 'text-white/55 hover:text-white hover:bg-white/8 [hover:background:rgba(255,255,255,0.08)]'
                  }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="divider !my-3" />

          {SECONDARY_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-white/35 hover:text-white/55 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{item.label}</span>
                </div>
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  {item.badge}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/8 text-center">
          <p className="text-xs text-white/20">v1.0 • Phase 1</p>
        </div>
      </aside>

      {/* ── Mobile overlay ───────────────────── */}
      {drawerOpen && (
        <div
          className="no-print fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ────────────────────── */}
      <aside
        className={`no-print fixed top-0 right-0 bottom-0 w-72 bg-slate-900 z-50 lg:hidden flex flex-col
          transition-transform duration-250 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <HardHat size={18} className="text-amber-400" />
            </div>
            <span className="text-white font-extrabold text-sm">Contractor AI Pro</span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.end);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all
                  ${active
                    ? '[background:rgba(201,162,39,0.18)] text-amber-400'
                    : 'text-white/55 hover:text-white [hover:background:rgba(255,255,255,0.08)]'
                  }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="divider !my-3" />

          {SECONDARY_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-white/35"
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{item.label}</span>
                </div>
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  {item.badge}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content ─────────────────────── */}
      <div className="flex-1 flex flex-col lg:mr-60 min-h-0">
        {/* Mobile top bar */}
        <header className="no-print lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-slate-900 shadow-md">
          <button
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <HardHat size={18} className="text-amber-400" />
            <span className="text-white font-bold text-sm">Contractor AI Pro</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6 min-h-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="no-print lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-white/10 flex z-30">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.end);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors
                  ${active ? 'text-amber-400' : 'text-white/40 hover:text-white/70'}`}
              >
                <Icon size={20} />
                <span className="text-[10px]">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
