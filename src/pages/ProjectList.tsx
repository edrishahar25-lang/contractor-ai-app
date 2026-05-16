import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, FolderOpen, Search } from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { useSettingsStore } from '../stores/settingsStore';
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_BADGE_CLASS, isExpired } from '../lib/format';
import { Button, Card, CardHeader, EmptyState, Badge } from '../components/ui';
import { ProjectStatus } from '../types';

const STATUS_FILTERS: { label: string; value: ProjectStatus | 'all' }[] = [
  { label: 'הכל', value: 'all' },
  { label: 'טיוטות', value: 'draft' },
  { label: 'נשלחו', value: 'sent' },
  { label: 'נחתמו', value: 'signed' },
  { label: 'נדחו', value: 'rejected' },
  { label: 'בביצוע', value: 'in_progress' },
  { label: 'הושלמו', value: 'completed' },
];

export default function ProjectList() {
  const navigate = useNavigate();
  const { projects, deleteProject } = useProjectStore();
  const { isCompanyConfigured } = useSettingsStore();
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = projects.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.client.name.toLowerCase().includes(q) ||
        p.client.city.toLowerCase().includes(q) ||
        p.client.address.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">הצעות מחיר</h1>
          <p className="page-subtitle">{projects.length} פרויקטים סה"כ</p>
        </div>
        <Button
          size="lg"
          onClick={() => navigate(isCompanyConfigured ? '/project/new' : '/settings')}
        >
          <PlusCircle size={18} />
          פרויקט חדש
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="search"
          className="input pr-9"
          placeholder="חיפוש לפי שם, עיר, כתובת..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((sf) => (
          <button
            key={sf.value}
            onClick={() => setFilter(sf.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
              ${filter === sf.value
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-400'
              }`}
          >
            {sf.label}
            {sf.value !== 'all' && (
              <span className="mr-1 opacity-60">
                ({projects.filter((p) => p.status === sf.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <span className="font-bold text-slate-800">
            {filtered.length} הצעות
          </span>
        </CardHeader>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={28} />}
            title={search || filter !== 'all' ? 'אין פרויקטים בסינון זה' : 'לא נמצאו הצעות מחיר'}
            description={
              search || filter !== 'all'
                ? 'נסה לשנות את הסינון'
                : 'צור את הפרויקט הראשון שלך'
            }
            action={
              !search && filter === 'all' ? (
                <Button onClick={() => navigate('/project/new')}>
                  <PlusCircle size={16} />
                  צור פרויקט חדש
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="table-wrap rounded-none rounded-b-2xl">
            <table className="data-table">
              <thead>
                <tr>
                  <th>לקוח</th>
                  <th className="hidden sm:table-cell">עיר</th>
                  <th className="hidden md:table-cell">גרסה</th>
                  <th className="hidden md:table-cell">תאריך</th>
                  <th>סטטוס</th>
                  <th>סה"כ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const v = p.versions.find((vv) => vv.id === p.currentVersionId);
                  const expired = isExpired(p.expiresAt) && !['signed', 'completed'].includes(p.status);
                  return (
                    <tr
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/project/${p.id}`)}
                    >
                      <td>
                        <div className="font-semibold text-slate-800">{p.client.name}</div>
                        <div className="text-xs text-gray-400">{p.client.phone}</div>
                        {expired && (
                          <div className="text-xs text-red-500 font-medium mt-0.5">פג תוקף</div>
                        )}
                      </td>
                      <td className="hidden sm:table-cell text-sm text-gray-500">
                        {p.client.city}
                      </td>
                      <td className="hidden md:table-cell">
                        <Badge variant="gray">v{v?.versionNumber ?? 1}</Badge>
                      </td>
                      <td className="hidden md:table-cell text-sm text-gray-500">
                        {formatDate(p.createdAt)}
                      </td>
                      <td>
                        <span className={STATUS_BADGE_CLASS[p.status]}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="font-bold text-slate-900">
                        {v ? formatCurrency(v.result.total) : '—'}
                      </td>
                      <td>
                        <div className="flex gap-1.5 justify-end">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`מחק פרויקט של ${p.client.name}?`)) {
                                deleteProject(p.id);
                              }
                            }}
                          >
                            מחק
                          </Button>
                        </div>
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
