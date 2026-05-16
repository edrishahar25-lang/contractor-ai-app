import { useState } from 'react';
import { LayoutDashboard } from 'lucide-react';

interface Props {
  sqm: number;
  hasScale: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const QUICK_NAMES = ['סלון', 'חדר שינה', 'מטבח', 'חדר רחצה', 'שירותים', 'מסדרון', 'מרפסת', 'חדר ילדים'];

export default function RoomNameDialog({ sqm, hasScale, onConfirm, onCancel }: Props) {
  const [name, setName] = useState('');

  function handleConfirm() {
    const n = name.trim();
    if (!n) return;
    onConfirm(n);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4" dir="rtl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <LayoutDashboard size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">שם החדר</h3>
            {hasScale ? (
              <p className="text-xs text-gray-500">שטח: {sqm.toFixed(1)} מ״ר</p>
            ) : (
              <p className="text-xs text-amber-600">כייל קנה מידה לחישוב שטח</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_NAMES.map((n) => (
            <button
              key={n}
              onClick={() => setName(n)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                name === n
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="mb-5">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            placeholder="שם מותאם אישית..."
            className="input"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={!name.trim()}
            className="btn btn-primary btn-md flex-1"
          >
            הוסף חדר
          </button>
          <button onClick={onCancel} className="btn btn-outline btn-md flex-1">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
