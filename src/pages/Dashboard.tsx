import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  FolderOpen,
  TrendingUp,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HardHat,
  ChevronLeft,
  Tag,
  Settings,
  DollarSign,
  Percent,
  Upload,
  Brain,
  ArrowUpRight,
} from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { useSettingsStore } from '../stores/settingsStore';
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_BADGE_CLASS, isExpired } from '../lib/format';
import { Button } from '../components/ui';

type StatVariant = 'gold' | 'blue' | 'green' | 'purple' | 'red' | 'teal';

const ICON_COLORS: Record<StatVariant, string> = {
  gold: '#f0c040',
  blue: '#60a5fa',
  green: '#4ade80',
  purple: '#c084fc',
  red: '#f87171',
  teal: '#2dd4bf',
};

function StatCard({
  label,
  value,
  icon,
  variant = 'gold',
  sub,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: StatVariant;
  sub?: string;
  trend?: string;
}) {
  const iconColor = ICON_COLORS[variant];
  return (
    <div className={`stat-card stat-${variant}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(232,238,248,0.5)' }}>
            {label}
          </p>
          <p
            className="text-2xl font-extrabold leading-tight truncate"
            style={{ color: iconColor }}
          >
            {value}
          </p>
          {sub && (
            <p className="text-xs mt-1" style={{ color: 'rgba(232,238,248,0.38)' }}>
              {sub}
            </p>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `rgba(${variant === 'gold' ? '212,160,23' : variant === 'blue' ? '59,130,246' : variant === 'green' ? '34,197,94' : variant === 'purple' ? '168,85,247' : variant === 'red' ? '239,68,68' : '20,184,166'}, 0.15)`,
          }}
        >
          <span style={{ color: iconColor }}>{icon}</span>
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          <ArrowUpRight size={12} style={{ color: iconColor }} />
          <span className="text-xs font-medium" style={{ color: iconColor }}>{trend}</span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { projects } = useProjectStore();
  const { isCompanyConfigured, company } = useSettingsStore();

  const activeProjects = projects.filter((p) => !p.archived);

  const total = activeProjects.length;
  const sent = activeProjects.filter((p) => p.status === 'sent').length;
  const signed = activeProjects.filter((p) => p.status === 'signed').length;
  const inProgress = activeProjects.filter((p) => p.status === 'in_progress').length;
  const expired = activeProjects.filter(
    (p) => isExpired(p.expiresAt) && p.status !== 'signed' && p.status !== 'completed',
  ).length;

  const totalRevenue = activeProjects.reduce((sum, p) => {
    const v = p.versions.find((v) => v.id === p.currentVersionId);
    return sum + (v?.result.total ?? 0);
  }, 0);

  const signedRevenue = activeProjects
    .filter((p) => p.status === 'signed')
    .reduce((sum, p) => {
      const v = p.versions.find((v) => v.id === p.currentVersionId);
      return sum + (v?.result.total ?? 0);
    }, 0);

  const inProgressRevenue = activeProjects
    .filter((p) => p.status === 'in_progress')
    .reduce((sum, p) => {
      const v = p.versions.find((v) => v.id === p.currentVersionId);
      return sum + (v?.result.total ?? 0);
    }, 0);

  const conversionRate =
    sent + signed > 0
      ? `${((signed / (sent + signed)) * 100).toFixed(0)}%`
      : '—';

  const withEstimates = activeProjects.filter((p) =>
    p.versions.find((v) => v.id === p.currentVersionId),
  );
  const avgValue = withEstimates.length > 0 ? totalRevenue / withEstimates.length : 0;

  const recent = activeProjects.slice(0, 8);

  const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="page-container fade-up">

      {/* Hero header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(212,160,23,0.7)' }}>
            {today}
          </p>
          <h1 className="text-3xl font-black mb-1" style={{ color: '#f0f4ff' }}>
            {company?.companyName ? `שלום, ${company.companyName}` : 'ברוך הבא'}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(232,238,248,0.45)' }}>
            {total > 0
              ? `${total} פרויקטים פעילים • ${signed} חתומים • ${inProgress} בביצוע`
              : 'צור את הפרויקט הראשון שלך'}
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => navigate(isCompanyConfigured ? '/project/new' : '/settings')}
        >
          <PlusCircle size={18} />
          פרויקט חדש
        </Button>
      </div>

      {/* First-time notice */}
      {!isCompanyConfigured && (
        <div className="alert alert-info mb-6 items-start">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <strong>כדי ליצור הצעת מחיר ראשונה, יש להשלים קודם את פרטי החברה.</strong>
            <br />
            <button
              className="underline text-sm mt-1 hover:opacity-80"
              onClick={() => navigate('/settings')}
            >
              עבור להגדרות →
            </button>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="הכנסות מוערכות"
          value={formatCurrency(totalRevenue)}
          icon={<TrendingUp size={19} />}
          variant="gold"
          sub="כולל מע״מ"
        />
        <StatCard
          label="הכנסות חתומות"
          value={signedRevenue > 0 ? formatCurrency(signedRevenue) : '—'}
          icon={<DollarSign size={19} />}
          variant="green"
          sub={inProgressRevenue > 0 ? `בביצוע: ${formatCurrency(inProgressRevenue)}` : 'טרם נחתם'}
        />
        <StatCard
          label="יחס המרה"
          value={conversionRate}
          icon={<Percent size={19} />}
          variant="purple"
          sub="נשלח → חתום"
        />
        <StatCard
          label="ממוצע לפרויקט"
          value={avgValue > 0 ? formatCurrency(avgValue) : '—'}
          icon={<TrendingUp size={19} />}
          variant="blue"
          sub="ערך ממוצע"
        />
        <StatCard
          label="סך פרויקטים"
          value={total}
          icon={<FolderOpen size={19} />}
          variant="teal"
        />
        <StatCard
          label="נשלחו"
          value={sent}
          icon={<FileText size={19} />}
          variant="blue"
          sub="ממתינים לתגובה"
        />
        <StatCard
          label="בביצוע"
          value={inProgress}
          icon={<CheckCircle size={19} />}
          variant="green"
        />
        <StatCard
          label="הצעות שפגו"
          value={expired}
          icon={<XCircle size={19} />}
          variant={expired > 0 ? 'red' : 'teal'}
          sub={expired > 0 ? 'דרוש עדכון' : 'הכל תקין'}
        />
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-sm font-bold mb-3" style={{ color: 'rgba(232,238,248,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          פעולות מהירות
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { label: 'פרויקט חדש', icon: PlusCircle, onClick: () => navigate('/project/new'), primary: true },
            { label: 'העלה תוכנית', icon: Upload, onClick: () => navigate('/blueprint') },
            { label: 'הפק מתיאור', icon: Brain, onClick: () => navigate('/estimate/brief') },
            { label: 'מחירון', icon: Tag, onClick: () => navigate('/pricing') },
            { label: 'הגדרות', icon: Settings, onClick: () => navigate('/settings') },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                className="flex flex-col items-center gap-2.5 py-4 px-3 rounded-2xl text-sm font-semibold transition-all duration-200 group"
                style={action.primary ? {
                  background: 'linear-gradient(135deg, rgba(212,160,23,0.18) 0%, rgba(212,160,23,0.08) 100%)',
                  border: '1px solid rgba(212,160,23,0.3)',
                  color: '#f0c040',
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(232,238,248,0.65)',
                }}
                onMouseEnter={(e) => {
                  if (!action.primary) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(232,238,248,0.9)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!action.primary) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(232,238,248,0.65)';
                  }
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={action.primary ? {
                    background: 'rgba(212,160,23,0.2)',
                  } : {
                    background: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <Icon size={19} />
                </div>
                <span className="text-xs text-center leading-tight">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: 'rgba(232,238,248,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            פרויקטים אחרונים
          </h2>
          {activeProjects.length > 0 && (
            <button
              onClick={() => navigate('/projects')}
              className="text-xs font-semibold flex items-center gap-1 transition-colors"
              style={{ color: 'rgba(212,160,23,0.7)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#f0c040')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(212,160,23,0.7)')}
            >
              הכל
              <ChevronLeft size={13} />
            </button>
          )}
        </div>

        <div className="card">
          {activeProjects.length === 0 ? (
            <div className="p-12 flex flex-col items-center gap-4 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.2)' }}
              >
                <HardHat size={28} style={{ color: '#d4a017' }} />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-base mb-1">עדיין אין פרויקטים</p>
                <p className="text-sm text-gray-500">צור את הפרויקט הראשון שלך וקבל הצעת מחיר מקצועית תוך דקות.</p>
              </div>
              <Button onClick={() => navigate(isCompanyConfigured ? '/project/new' : '/settings')}>
                <PlusCircle size={16} />
                צור פרויקט ראשון
              </Button>
            </div>
          ) : (
            <div className="table-wrap rounded-none rounded-b-2xl">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>לקוח</th>
                    <th className="hidden md:table-cell">כתובת</th>
                    <th className="hidden sm:table-cell">תאריך</th>
                    <th>סטטוס</th>
                    <th>סכום</th>
                    <th className="hidden md:table-cell"></th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p) => {
                    const v = p.versions.find((v) => v.id === p.currentVersionId);
                    const isExp = isExpired(p.expiresAt) && !['signed', 'completed'].includes(p.status);
                    return (
                      <tr
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/project/${p.id}`)}
                      >
                        <td>
                          <div className="font-semibold text-slate-800">{p.client.name || '—'}</div>
                          <div className="text-xs text-gray-400">{p.client.phone}</div>
                        </td>
                        <td className="hidden md:table-cell text-sm text-gray-500">
                          {p.client.city || '—'}
                        </td>
                        <td className="hidden sm:table-cell text-sm text-gray-500">
                          {formatDate(p.createdAt)}
                          {isExp && (
                            <div className="text-xs text-red-500 font-medium">פג תוקף</div>
                          )}
                        </td>
                        <td>
                          <span className={STATUS_BADGE_CLASS[p.status]}>
                            {STATUS_LABELS[p.status]}
                          </span>
                        </td>
                        <td className="font-bold text-slate-900">
                          {v ? formatCurrency(v.result.total) : '—'}
                        </td>
                        <td className="hidden md:table-cell">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/project/${p.id}`);
                            }}
                          >
                            פתח
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
