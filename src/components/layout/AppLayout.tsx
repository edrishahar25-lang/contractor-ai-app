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
  Sparkles,
  Zap,
  Mic,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'דשבורד', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'הצעות מחיר', icon: FolderOpen, end: false },
  { to: '/project/new', label: 'פרויקט חדש', icon: PlusCircle, end: false },
  { to: '/voice', label: 'Voice to Quote', icon: Mic, end: false },
  { to: '/pricing', label: 'מחירון', icon: Tag, end: false },
  { to: '/settings', label: 'הגדרות', icon: Settings, end: false },
];

const SECONDARY_NAV = [
  { to: '/photos', label: 'ניתוח תמונות', icon: Camera },
  { to: '/blueprint', label: 'תוכניות AI', icon: Map },
];

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (to: string, end: boolean) =>
    end ? location.pathname === to : location.pathname.startsWith(to);

  const navItemClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
      active
        ? 'nav-link-active'
        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
    }`;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8fafc' }}>

      {/* ── Desktop Sidebar ─────────────────── */}
      <aside
        className="no-print hidden lg:flex flex-col fixed right-0 top-0 bottom-0 w-64 z-40 bg-white"
        style={{ borderLeft: '1px solid #e2e8f0', boxShadow: '-4px 0 24px rgba(0,0,0,0.04)' }}
      >
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 px-5 py-5 w-full text-right transition-all hover:bg-slate-50"
          style={{ borderBottom: '1px solid #f1f5f9' }}
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
              boxShadow: '0 4px 14px rgba(13,148,136,0.35)',
            }}
          >
            <HardHat size={20} className="text-white" />
          </div>
          <div className="text-right">
            <div className="text-slate-800 font-extrabold text-sm leading-tight tracking-wide">
              Contractor
            </div>
            <div
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: '#0d9488', letterSpacing: '0.15em' }}
            >
              AI Pro
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
                className={navItemClass(active)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="my-3" style={{ height: '1px', background: '#f1f5f9' }} />

          {SECONDARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, false);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={navItemClass(active)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* AI badge at bottom */}
        <div className="p-4" style={{ borderTop: '1px solid #f1f5f9' }}>
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: '#f0fdfa', border: '1px solid #ccfbf1' }}
          >
            <Sparkles size={14} style={{ color: '#0d9488' }} />
            <span className="text-xs font-semibold" style={{ color: '#0f766e' }}>
              Powered by Claude AI
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-xs text-slate-400">v2.0 Pro</span>
            <div className="flex items-center gap-1">
              <Zap size={10} className="text-teal-400" />
              <span className="text-xs text-slate-400">Israel Edition</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile overlay ───────────────────── */}
      {drawerOpen && (
        <div
          className="no-print fixed inset-0 z-50 lg:hidden"
          style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ────────────────────── */}
      <aside
        className={`no-print fixed top-0 right-0 bottom-0 w-72 z-50 lg:hidden flex flex-col bg-white
          transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ borderLeft: '1px solid #e2e8f0', boxShadow: '-8px 0 32px rgba(0,0,0,0.08)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #f1f5f9' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)', boxShadow: '0 3px 10px rgba(13,148,136,0.3)' }}
            >
              <HardHat size={16} className="text-white" />
            </div>
            <span className="text-slate-800 font-extrabold text-sm">Contractor AI Pro</span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-lg transition-colors hover:bg-slate-100"
            style={{ color: '#64748b' }}
          >
            <X size={18} />
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
                className={navItemClass(active)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="my-3" style={{ height: '1px', background: '#f1f5f9' }} />

          {SECONDARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, false);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setDrawerOpen(false)}
                className={navItemClass(active)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content ─────────────────────── */}
      <div className="flex-1 flex flex-col lg:mr-64 min-h-0">
        {/* Mobile top bar */}
        <header
          className="no-print lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white shadow-sm"
          style={{ borderBottom: '1px solid #e2e8f0' }}
        >
          <button
            className="p-2 rounded-lg transition-colors hover:bg-slate-100"
            style={{ color: '#64748b' }}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}
            >
              <HardHat size={14} className="text-white" />
            </div>
            <span className="text-slate-800 font-bold text-sm">Contractor AI Pro</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6 min-h-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="no-print lg:hidden fixed bottom-0 left-0 right-0 h-16 flex z-30 bg-white"
          style={{ borderTop: '1px solid #e2e8f0', boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' }}
        >
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.end);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors ${
                  active ? 'text-teal-600' : 'text-slate-400'
                }`}
              >
                <Icon size={19} />
                <span className="text-[10px]">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
