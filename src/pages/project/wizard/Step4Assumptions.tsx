import { AutoAssumptions, Property, SelectedWorkItem } from '../../../types';
import { formatNumber } from '../../../lib/format';

interface Props {
  property: Property;
  computed: AutoAssumptions;
  overrides: Partial<AutoAssumptions>;
  onOverride: (patch: Partial<AutoAssumptions>) => void;
  selectedItems: SelectedWorkItem[];
}

interface AssumptionRow {
  key: keyof AutoAssumptions;
  label: string;
  unit: string;
  description: string;
}

const ROWS: AssumptionRow[] = [
  { key: 'paintArea', label: 'שטח לצביעה', unit: 'מ"ר', description: 'שטח × 3 (קירות + תקרה)' },
  { key: 'flooringArea', label: 'שטח ריצוף', unit: 'מ"ר', description: 'שטח הנכס' },
  { key: 'skirtingLength', label: 'אורך פנלים', unit: 'מ׳', description: 'שטח × 1.2' },
  { key: 'electricalPoints', label: 'נקודות חשמל', unit: 'יח׳', description: 'חדרים×6 + אמבטיות×2 + מטבח×8' },
  { key: 'plumbingPoints', label: 'נקודות אינסטלציה', unit: 'יח׳', description: 'אמבטיות×4 + מטבחים×3' },
];

export default function Step4Assumptions({
  computed,
  overrides,
  onOverride,
  property,
  selectedItems,
}: Props) {
  const getValue = (key: keyof AutoAssumptions): number =>
    overrides[key] !== undefined ? overrides[key]! : computed[key];

  const hasElectrical = selectedItems.some((s) => s.categoryId === 'electrical');
  const hasPlumbing = selectedItems.some((s) => s.categoryId === 'plumbing');

  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-900 mb-1">הנחות אוטומטיות</h2>
      <p className="text-sm text-gray-500 mb-5">
        המערכת חישבה כמויות מוצעות על בסיס פרטי הנכס. ניתן לעדכן לפני הגשת ההצעה.
      </p>

      {/* Property summary */}
      <div className="bg-slate-50 border border-gray-200 rounded-2xl p-4 mb-5 text-sm">
        <div className="flex flex-wrap gap-4">
          {[
            { l: 'שטח', v: `${property.totalSqm} מ"ר` },
            { l: 'חדרים', v: property.rooms },
            { l: 'אמבטיות', v: property.bathrooms },
            { l: 'מטבחים', v: property.kitchens },
          ].map((item) => (
            <div key={item.l}>
              <div className="text-xs text-gray-400">{item.l}</div>
              <div className="font-bold text-slate-800">{item.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {ROWS.map((row) => {
          const isOverridden = overrides[row.key] !== undefined;
          const displayValue = getValue(row.key);
          return (
            <div
              key={row.key}
              className={`card p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-all
                ${isOverridden ? 'border-amber-300 bg-amber-50/30' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 text-sm">{row.label}</div>
                <div className="text-xs text-gray-400">{row.description}</div>
                {isOverridden && (
                  <div className="text-xs text-amber-600 font-medium mt-0.5">
                    שונה ידנית (ברירת מחדל: {formatNumber(computed[row.key])} {row.unit})
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={displayValue || ''}
                  onChange={(e) => onOverride({ [row.key]: Number(e.target.value) })}
                  min={0}
                  className="input w-28 text-center text-sm py-2"
                  placeholder="0"
                />
                <span className="text-sm text-gray-500 w-10 flex-shrink-0">{row.unit}</span>
                {isOverridden && (
                  <button
                    type="button"
                    onClick={() => {
                      const { [row.key]: _, ...rest } = overrides;
                      onOverride(rest as Partial<AutoAssumptions>);
                    }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    title="איפוס לברירת מחדל"
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Smart hints */}
      {!hasElectrical && computed.electricalPoints > 0 && (
        <div className="alert alert-info mt-4 text-sm">
          💡 זיהינו {formatNumber(computed.electricalPoints)} נקודות חשמל מוערכות — שקול להוסיף קטגוריית חשמל.
        </div>
      )}
      {!hasPlumbing && computed.plumbingPoints > 0 && (
        <div className="alert alert-info mt-2 text-sm">
          💡 זיהינו {formatNumber(computed.plumbingPoints)} נקודות אינסטלציה מוערכות — שקול להוסיף קטגוריית אינסטלציה.
        </div>
      )}
    </div>
  );
}
