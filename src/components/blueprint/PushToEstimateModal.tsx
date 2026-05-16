import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertTriangle, GitMerge, RefreshCw } from 'lucide-react';
import { useBlueprintStore } from '../../stores/blueprintStore';
import { useProjectStore } from '../../stores/projectStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { deriveBOQ, boqToSelectedItems, mergeSelectedItems } from '../../lib/blueprintBOQ';
import type { SelectedWorkItem } from '../../types';
import { Button, Alert } from '../ui';

interface Props {
  onClose: () => void;
}

type Mode = 'replace' | 'merge';

export default function PushToEstimateModal({ onClose }: Props) {
  const navigate = useNavigate();
  const { rooms, annotations, calibration, linkedProjectId } = useBlueprintStore();
  const { getProject, createVersionWithItems } = useProjectStore();
  const { pricing } = useSettingsStore();

  const [mode, setMode] = useState<Mode>('replace');
  const [updatePrices, setUpdatePrices] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const project = linkedProjectId ? getProject(linkedProjectId) : undefined;
  const currentVersion = project?.versions.find((v) => v.id === project.currentVersionId);
  const hasManualItems = (currentVersion?.selectedItems.length ?? 0) > 0;
  const isLockedStatus = project?.status === 'sent' || project?.status === 'signed';

  const boqLines = deriveBOQ(rooms, annotations, calibration, pricing.itemPrices);
  const { items: blueprintItems, warnings } = boqToSelectedItems(boqLines, pricing.itemPrices);

  async function handlePush() {
    if (!project) return;
    setSaving(true);
    setError('');

    try {
      let finalItems: SelectedWorkItem[];
      if (mode === 'merge' && currentVersion) {
        finalItems = mergeSelectedItems(
          currentVersion.selectedItems,
          blueprintItems,
          updatePrices,
          pricing.itemPrices,
        );
      } else {
        finalItems = blueprintItems;
      }

      const version = createVersionWithItems(project.id, finalItems, 'נוצר מתוך תוכנית בנייה');
      navigate(`/project/${project.id}/estimate`);
      onClose();
      void version;
    } catch {
      setError('שגיאה ביצירת הגרסה. נסה שוב.');
      setSaving(false);
    }
  }

  if (!project) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
          <AlertTriangle size={32} className="text-amber-500 mx-auto mb-3" />
          <h2 className="font-bold text-slate-900 mb-2">אין פרויקט משויך</h2>
          <p className="text-sm text-gray-500 mb-4">יש ליצור פרויקט חדש או לשייך לפרויקט קיים לפני העברת כמויות.</p>
          <Button onClick={onClose}>סגור</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">העבר כמויות להצעת מחיר</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              פרויקט: <strong>{project.client.name}</strong> · {blueprintItems.length} פריטי עבודה
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isLockedStatus && (
            <Alert variant="warning" icon={<AlertTriangle size={14} />}>
              פרויקט זה כבר {project.status === 'signed' ? 'נחתם' : 'נשלח'}. דחיפת כמויות תיצור גרסת טיוטה חדשה ותאפס את הסטטוס.
            </Alert>
          )}

          {warnings.length > 0 && (
            <Alert variant="warning" icon={<AlertTriangle size={14} />}>
              {warnings.length} סימונים לא תורגמו למחירון: {warnings.join(' | ')}
            </Alert>
          )}

          {blueprintItems.length === 0 && (
            <Alert variant="warning" icon={<AlertTriangle size={14} />}>
              לא נמצאו כמויות בתוכנית. ודא שהכיול תקין ושיש סימונים.
            </Alert>
          )}

          {/* Mode selection — only when project has existing items */}
          {hasManualItems && (
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-2">
                הפרויקט כבר כולל {currentVersion?.selectedItems.length} סעיפים ידניים. כיצד להמשיך?
              </p>
              <div className="space-y-2">
                <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                  ${mode === 'replace' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <input type="radio" className="mt-0.5" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                  <div>
                    <div className="flex items-center gap-2">
                      <RefreshCw size={14} className="text-amber-600" />
                      <span className="font-semibold text-sm text-slate-800">גרסה חדשה מתוכנית בלבד</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">הסעיפים הידניים יישארו בגרסה הקודמת</p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                  ${mode === 'merge' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <input type="radio" className="mt-0.5" checked={mode === 'merge'} onChange={() => setMode('merge')} />
                  <div>
                    <div className="flex items-center gap-2">
                      <GitMerge size={14} className="text-blue-600" />
                      <span className="font-semibold text-sm text-slate-800">מזג כמויות התוכנית עם הסעיפים הידניים</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">כמויות זהות יסוכמו. פריטים חדשים יתווספו.</p>
                  </div>
                </label>

                {mode === 'merge' && (
                  <label className="flex items-center gap-2 pr-3 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updatePrices}
                      onChange={(e) => setUpdatePrices(e.target.checked)}
                    />
                    <span className="text-xs text-gray-600">עדכן מחירים לפי מחירון נוכחי</span>
                  </label>
                )}
              </div>
            </div>
          )}

          {!hasManualItems && blueprintItems.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-gray-600">
                תיווצר גרסת הצעת מחיר חדשה עם {blueprintItems.length} פריטים מהתוכנית.
              </p>
            </div>
          )}

          {error && <Alert variant="error">{error}</Alert>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 gap-3">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button
            size="lg"
            onClick={handlePush}
            loading={saving}
            disabled={blueprintItems.length === 0}
          >
            העבר להצעת מחיר
          </Button>
        </div>
      </div>
    </div>
  );
}
