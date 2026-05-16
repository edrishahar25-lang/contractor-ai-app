import { ListChecks, AlertTriangle, ChevronLeft } from 'lucide-react';
import { useBlueprintStore } from '../../stores/blueprintStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { deriveBOQ } from '../../lib/blueprintBOQ';
import type { BpFile } from '../../types/blueprint';

const UNIT_LABELS: Record<string, string> = {
  sqm: 'מ״ר',
  meter: 'מ׳',
  unit: 'יח׳',
};

interface Props {
  file: BpFile | null;
  onClose: () => void;
}

export default function BlueprintBOQPanel({ file, onClose }: Props) {
  const { rooms, annotations, calibration } = useBlueprintStore();
  const { pricing } = useSettingsStore();

  const boq = deriveBOQ(rooms, annotations, calibration, pricing.itemPrices);
  const grandTotal = boq.reduce((s, l) => s + l.total, 0);
  const hasScale = !!calibration.pixelsPerMeter;

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-100" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ListChecks size={16} className="text-amber-400" />
          <span className="font-bold text-white text-sm">כתב כמויות</span>
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
                className="bg-gray-50 rounded-xl p-3 border border-gray-100"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800 leading-tight">{line.label}</span>
                  <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                    ₪{line.total.toLocaleString()}
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
      </div>

      {/* Total */}
      {boq.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-600">סה״כ משוער</span>
            <span className="text-lg font-extrabold text-slate-900">
              ₪{grandTotal.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 text-left">לפני מע״מ ורווח קבלן</p>
        </div>
      )}
    </div>
  );
}
