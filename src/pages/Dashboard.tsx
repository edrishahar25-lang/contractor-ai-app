import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  FolderOpen,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HardHat,
  ChevronLeft,
} from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { useSettingsStore } from '../stores/settingsStore';
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_BADGE_CLASS, isExpired } from '../lib/format';
import { Button, Card, CardHeader, EmptyState } from '../components/ui';

function StatCard({
  label,
  value,
  icon,
  iconBg = 'bg-amber-100',
  iconColor = 'text-amber-700',
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  sub?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-extrabold text-slate-900 leading-tight truncate">
            {value}
          </p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 ${iconColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { projects } = useProjectStore();
  const { isCompanyConfigured } = useSettingsStore();

  const total = projects.length;
  const drafts = projects.filter((p) => p.status === 'draft').length;
  const sent = projects.filter((p) => p.status === 'sent').length;
  const signed = projects.filter((p) => p.status === 'signed').length;
  const expired = projects.filter((p) => isExpired(p.expiresAt) && p.status !== 'signed' && p.status !== 'completed').length;

  const totalRevenue = projects.reduce((sum, p) => {
    const v = p.versions.find((v) => v.id === p.currentVersionId);
    return sum + (v?.result.total ?? 0);
  }, 0);

  const withEstimates = projects.filter((p) =>
    p.versions.find((v) => v.id === p.currentVersionId),
  );
  const avgValue =
    withEstimates.length > 0
      ? totalRevenue / withEstimates.length
      : 0;

  const recent = projects.slice(0, 8);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">דשבורד</h1>
          <p className="page-subtitle">ברוך הבא למערכת Contractor AI Pro</p>
        </div>
        <Button
          size="lg"
          onClick={() => {
            if (!isCompanyConfigured) {
              navigate('/settings');
            } else {
              navigate('/project/new');
            }
          }}
        >
          <PlusCircle size={18} />
          פרויקט חדש
        </Button>
      </div>

      {/* First-time notice */}
      {!isCompanyConfigured && (
        <div className="alert alert-info mb-5 items-start">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="סך פרויקטים"
          value={total}
          icon={<FolderOpen size={20} />}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
        />
        <StatCard
          label="טיוטות"
          value={drafts}
          icon={<Clock size={20} />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          label="נשלחו"
          value={sent}
          icon={<FileText size={20} />}
          iconBg="bg-amber-100"
          iconColor="text-amber-700"
        />
        <StatCard
          label="נחתמו"
          value={signed}
          icon={<CheckCircle size={20} />}
          iconBg="bg-green-100"
          iconColor="text-green-700"
        />
        <StatCard
          label="הכנסות מוערכות"
          value={formatCurrency(totalRevenue)}
          icon={<TrendingUp size={20} />}
          iconBg="bg-amber-100"
          iconColor="text-amber-700"
          sub="כולל מע״מ"
        />
        <StatCard
          label="ממוצע לפרויקט"
          value={avgValue > 0 ? formatCurrency(avgValue) : '—'}
          icon={<TrendingUp size={20} />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatCard
          label="הצעות שפגו"
          value={expired}
          icon={<XCircle size={20} />}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          sub={expired > 0 ? 'דרוש עדכון' : 'הכל תקין'}
        />
      </div>

      {/* Recent projects */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FolderOpen size={17} className="text-slate-700" />
            <h2 className="font-bold text-slate-800">פרויקטים אחרונים</h2>
          </div>
          {projects.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/projects')}
            >
              הכל
              <ChevronLeft size={14} />
            </Button>
          )}
        </CardHeader>

        {projects.length === 0 ? (
          <EmptyState
            icon={<HardHat size={30} />}
            title="עדיין אין פרויקטים"
            description="צור את הפרויקט הראשון שלך וקבל הצעת מחיר מקצועית תוך דקות."
            action={
              <Button onClick={() => navigate(isCompanyConfigured ? '/project/new' : '/settings')}>
                <PlusCircle size={16} />
                צור פרויקט ראשון
              </Button>
            }
          />
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
                  const expired = isExpired(p.expiresAt) && !['signed', 'completed'].includes(p.status);
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
                        {expired && (
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
      </Card>
    </div>
  );
}
