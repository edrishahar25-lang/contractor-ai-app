import { useMemo } from 'react';
import { ListChecks, AlertTriangle, ChevronLeft, RefreshCw, Trash2, ArrowUpRight, Sparkles, Lock } from 'lucide-react';
import { useBlueprintStore } from '../../stores/blueprintStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useProjectStore } from '../../stores/projectStore';
import { deriveBOQ, boqToSelectedItems, validateScaleWarnings } from '../../lib/blueprintBOQ';
import type { BpFile } from '../../types/blueprint';

const UNIT_LABELS: Record<string, string> = {
  sqm: 'מ״ר',
  meter: 'מ׳',
  unit: 'יח׳',
};

interface Props {
  file: BpFile | null;
  onClose: () => void;
  onPushToEstimate?: () => void;
}

export default function BlueprintBOQPanel({ file, onClose, onPushToEstimate }: Props) {
  const { rooms, annotations, calibration, clearAll, linkedProjectId } = useBlueprintStore();
  const { pricing } = useSettingsStore();
  const { getProject } = useProjectStore();

  const boq = useMemo(
    () => deriveBOQ(rooms, annotations, calibration, pricing.itemPrices),
    [rooms, annotations, calibration, pricing.itemPrices],
  );
  const { warnings: conversionWarnings } = useMemo(
    () => boqToSelectedItems(boq, pricing.itemPrices),
    [boq, pricing.itemPrices],
  );
  const scaleWarnings = useMemo(
    () => validateScaleWarnings(rooms, annotations, calibration),
    [rooms, annotations, calibration],
  );
  const grandTotal = boq.reduce((s, l) => s + l.total, 0);
  const hasScale = !!calibration.pixelsPerMeter;
  const linkedProject = linkedProjectId ? getProject(linkedProjectId) : undefined;

  const missingPriceLines = boq.filter((l) => l.unitPrice === 0);

  function handleClearAll() {
    if (window.confirm('מחיקת כל החדרים, הסימונים וכיול קנה המידה?')) {
      clearAll();
    }
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-100" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ListChecks size={16} className="text-amber-400" />
          <span className="font-bold text-white text-sm">כתב כמויות</span>
          {linkedProject && (
            <span className="text-xs text-green-400 truncate max-w-24">{linkedProject.client.name}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white transition-colors p-1"
          title="סגור פאנל"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Scale warning */}
      {!hasScale && (
        <div className="mx-3 mt-3 flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <span>כייל קנה מידה לחישוב כמויות מדויקות</span>
        </div>
      )}

      {/* Missing price warning */}
      {missingPriceLines.length > 0 && (
        <div className="mx-3 mt-2 flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <span>{missingPriceLines.length} פריטים ללא מחיר במחירון: {missingPriceLines.map(l => l.label).join(' | ')}</span>
        </div>
      )}

      {/* Scale warnings */}
      {scaleWarnings.map((w, i) => (
        <div key={i} className="mx-3 mt-2 flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <span>{w}</span>
        </div>
      ))}

      {/* Conversion warnings */}
      {conversionWarnings.length > 0 && (
        <div className="mx-3 mt-2 flex gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-800">
          <AlertTriangle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
          <span>{conversionWarnings.length} סימונים לא תורגמו: {conversionWarnings.join(' | ')}</span>
        </div>
      )}

      {/* Stats */}
      {file && (
        <div className="grid grid-cols-2 gap-2 px-3 pt-3">
          <div className="bg-blue-50 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold text-blue-700">{rooms.length}</div>
            <div className="text-xs text-blue-500">חדרים</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold text-slate-700">{annotations.length}</div>
            <div className="text-xs text-slate-500">סימונים</div>
          </div>
        </div>
      )}

      {/* BOQ lines */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {boq.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400">
            <ListChecks size={32} className="mx-auto mb-3 text-gray-200" />
            <p>סמן חדרים ואלמנטים</p>
            <p className="text-xs mt-1">לכתב הכמויות האוטומטי</p>
          </div>
        ) : (
          <div className="space-y-2">
            {boq.map((line) => (
              <div
                key={line.key}
                className={`rounded-xl p-3 border ${line.unitPrice === 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-slate-800 leading-tight">{line.label}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">תוכנית</span>
                      {line.unitPrice === 0 && (
                        <span className="text-xs text-red-500">מחיר חסר</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                    {line.unitPrice === 0 ? '—' : `₪${line.total.toLocaleString()}`}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-gray-500">
                    {line.quantity} {UNIT_LABELS[line.unit]} × ₪{line.unitPrice}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Suggestions placeholder */}
        <div className="mt-4 rounded-xl border-2 border-dashed border-purple-200 p-4 bg-purple-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={15} className="text-purple-400" />
            <span className="text-sm font-bold text-purple-700">AI הצעות חכמות</span>
            <Lock size={12} className="text-purple-400 mr-auto" />
          </div>
          <p className="text-xs text-purple-600 leading-relaxed">
            AI יציע חדרים, קירות ונקודות עבודה מתוך התוכנית. הקבלן יאשר או יתקן לפני שהכמויות נכנסות להצעה.
          </p>
          <div className="mt-2 text-xs text-purple-400 font-semibold">בקרוב</div>
        </div>
      </div>

      {/* Total + action buttons */}
      <div className="border-t border-gray-100 px-3 py-3 flex-shrink-0 space-y-2">
        {boq.length > 0 && (
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-sm font-bold text-gray-600">סה״כ משוער</span>
            <span className="text-lg font-extrabold text-slate-900">
              ₪{grandTotal.toLocaleString()}
            </span>
          </div>
        )}

        <button
          onClick={onPushToEstimate}
          disabled={boq.length === 0}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowUpRight size={15} />
          העבר להצעת מחיר
        </button>

        <button
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
        >
          <RefreshCw size={13} />
          עדכן לפי מחירון נוכחי
        </button>

        <button
          onClick={handleClearAll}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={13} />
          נקה סימונים
        </button>

        <p className="text-xs text-gray-400 text-center">לפני מע״מ ורווח קבלן</p>
      </div>
    </div>
  );
}
