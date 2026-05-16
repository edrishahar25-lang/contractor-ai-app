import { useState } from 'react';
import { X, Search, ChevronLeft } from 'lucide-react';
import { useBlueprintStore } from '../../stores/blueprintStore';
import { useProjectStore } from '../../stores/projectStore';
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_BADGE_CLASS } from '../../lib/format';
import { Button } from '../ui';

interface Props {
  onClose: () => void;
  onLinked?: (projectId: string) => void;
}

export default function LinkProjectModal({ onClose, onLinked }: Props) {
  const { projects } = useProjectStore();
  const { setLinkedProject, setBlueprintName } = useBlueprintStore();
  const [search, setSearch] = useState('');

  const active = projects
    .filter((p) => !p.archived)
    .filter((p) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.client.name.toLowerCase().includes(q) ||
        p.client.city.toLowerCase().includes(q) ||
        p.client.address.toLowerCase().includes(q)
      );
    });

  function handleSelect(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    setLinkedProject(projectId);
    setBlueprintName(`תוכנית - ${project.client.name}`);
    onLinked?.(projectId);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">שייך לפרויקט קיים</h2>
            <p className="text-xs text-gray-500 mt-0.5">בחר פרויקט להעברת כמויות התוכנית</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pr-9"
              placeholder="חיפוש לפי שם לקוח, כתובת..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Project list */}
        <div className="overflow-y-auto flex-1">
          {active.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              {search ? 'לא נמצאו פרויקטים' : 'אין פרויקטים קיימים'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {active.map((p) => {
                const v = p.versions.find((v) => v.id === p.currentVersionId);
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(p.id)}
                    className="w-full text-right px-5 py-3.5 hover:bg-amber-50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-sm">{p.client.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {p.client.address}, {p.client.city}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`${STATUS_BADGE_CLASS[p.status]} text-xs`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(p.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      {v && (
                        <div className="font-bold text-slate-900 text-sm">{formatCurrency(v.result.total)}</div>
                      )}
                      <ChevronLeft size={16} className="text-gray-400 mr-auto mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
          <Button variant="outline" className="w-full" onClick={onClose}>ביטול</Button>
        </div>
      </div>
    </div>
  );
}
