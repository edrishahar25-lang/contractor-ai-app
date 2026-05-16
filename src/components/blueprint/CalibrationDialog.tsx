import { useState } from 'react';
import { Ruler } from 'lucide-react';

interface Props {
  pixelDist: number;
  onConfirm: (meters: number) => void;
  onCancel: () => void;
}

export default function CalibrationDialog({ pixelDist, onConfirm, onCancel }: Props) {
  const [meters, setMeters] = useState('');

  function handleConfirm() {
    const val = parseFloat(meters);
    if (!val || val <= 0) return;
    onConfirm(val);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4" dir="rtl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Ruler size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">כיול קנה מידה</h3>
            <p className="text-xs text-gray-500">סמנת {Math.round(pixelDist)} פיקסלים</p>
          </div>
        </div>

        <div className="mb-5">
          <label className="label">מרחק אמיתי בין הנקודות (מטרים)</label>
          <input
            autoFocus
            type="number"
            value={meters}
            onChange={(e) => setMeters(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            min={0.1}
            step={0.1}
            placeholder="לדוגמה: 3.5"
            className="input"
          />
          {meters && parseFloat(meters) > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              יחס: {(pixelDist / parseFloat(meters)).toFixed(1)} פיקסל/מטר
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={!meters || parseFloat(meters) <= 0}
            className="btn btn-primary btn-md flex-1"
          >
            אשר כיול
          </button>
          <button onClick={onCancel} className="btn btn-outline btn-md flex-1">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
