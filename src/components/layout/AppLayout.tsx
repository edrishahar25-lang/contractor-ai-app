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
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'דשבורד', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'הצעות מחיר', icon: FolderOpen, end: false },
  { to: '/project/new', label: 'פרויקט חדש', icon: PlusCircle, end: false },
  { to: '/pricing', label: 'מחירון', icon: Tag, end: false },
  { to: '/settings', label: 'הגדרות', icon: Settings, end: false },
];

const SECONDARY_NAV = [
  { to: '/photos', label: 'ניתוח תמונות', icon: Camera },
  { to: '/blueprint', label: 'תוכניות AI', icon: Map },
];

const SIDEBAR_BG = 'linear-gradient(175deg, #020912 0%, #04101f 55%, #061525 100%)';

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
        : 'text-white/45 hover:text-white/85 hover:bg-white/5'
    }`;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#04101f' }}>

      {/* ── Desktop Sidebar ─────────────────── */}
      <aside
        className="no-print hidden lg:flex flex-col fixed right-0 top-0 bottom-0 w-64 z-40"
        style={{ background: SIDEBAR_BG, borderLeft: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Subtle left border gradient */}
        <div
          className="absolute left-0 top-0 bottom-0 w-px"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(212,160,23,0.3) 40%, rgba(212,160,23,0.15) 70%, transparent 100%)' }}
        />

        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 px-5 py-5 w-full text-right transition-all hover:bg-white/3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 relative"
            style={{
              background: 'linear-gradient(135deg, rgba(212,160,23,0.22) 0%, rgba(212,160,23,0.08) 100%)',
              boxShadow: '0 0 16px rgba(212,160,23,0.28), inset 0 1px 0 rgba(255,255,255,0.08)',
              border: '1px solid rgba(212,160,23,0.25)',
            }}
          >
            <HardHat size={20} className="text-amber-400" />
          </div>
          <div className="text-right">
            <div className="text-white font-extrabold text-sm leading-tight tracking-wide">
              Contractor
            </div>
            <div
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: '#d4a017', letterSpacing: '0.15em' }}
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

          <div
            className="my-3"
            style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }}
          />

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
        <div
          className="p-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.15)' }}
          >
            <Sparkles size={14} style={{ color: '#d4a017' }} />
            <span className="text-xs font-semibold" style={{ color: 'rgba(240,192,64,0.8)' }}>
              Powered by Claude AI
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-xs" style={{ color: 'rgba(232,238,248,0.18)' }}>v2.0 Pro</span>
            <div className="flex items-center gap-1">
              <Zap size={10} style={{ color: 'rgba(212,160,23,0.4)' }} />
              <span className="text-xs" style={{ color: 'rgba(232,238,248,0.2)' }}>Israel Edition</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile overlay ───────────────────── */}
      {drawerOpen && (
        <div
          className="no-print fixed inset-0 z-50 lg:hidden"
          style={{ background: 'rgba(2,8,16,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ────────────────────── */}
      <aside
        className={`no-print fixed top-0 right-0 bottom-0 w-72 z-50 lg:hidden flex flex-col
          transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: SIDEBAR_BG, borderLeft: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(212,160,23,0.22) 0%, rgba(212,160,23,0.08) 100%)',
                border: '1px solid rgba(212,160,23,0.25)',
              }}
            >
              <HardHat size={16} className="text-amber-400" />
            </div>
            <div>
              <span className="text-white font-extrabold text-sm">Contractor AI Pro</span>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(232,238,248,0.45)', background: 'rgba(255,255,255,0.05)' }}
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

          <div
            className="my-3"
            style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }}
          />

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
          className="no-print lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 shadow-lg"
          style={{ background: '#030d1c', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'rgba(232,238,248,0.6)', background: 'rgba(255,255,255,0.06)' }}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <HardHat size={16} className="text-amber-400" />
            <span className="text-white font-bold text-sm">Contractor AI Pro</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6 min-h-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="no-print lg:hidden fixed bottom-0 left-0 right-0 h-16 flex z-30"
          style={{ background: '#030d1c', borderTop: '1px solid rgba(255,255,255,0.07)' }}
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
                  active ? 'text-amber-400' : 'text-white/35'
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
