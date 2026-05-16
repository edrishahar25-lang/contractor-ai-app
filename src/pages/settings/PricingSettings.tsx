import { useState } from 'react';
import { Save, CheckCircle, RefreshCw, Info } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { DEFAULT_ITEM_PRICES } from '../../lib/pricingEngine';
import { Button, Card, CardHeader, Alert, Badge } from '../../components/ui';
import { WORK_CATEGORIES } from '../../data/workCategories';
import { UNIT_LABELS } from '../../lib/format';

// ─── Label maps ───────────────────────────────────────────────────────────────

const PRICE_LABEL: Record<string, string> = {
  sqm:      'מחיר למ״ר',
  meter:    'מחיר למטר רץ',
  unit:     'מחיר ליחידה',
  complete: 'מחיר קומפלט',
  work_day: 'מחיר ליום עבודה',
};

const COST_META: Record<string, { text: string; variant: 'blue' | 'green' | 'yellow' }> = {
  material: { text: 'חומר',   variant: 'blue' },
  labor:    { text: 'עבודה',  variant: 'green' },
  mixed:    { text: 'משולב',  variant: 'yellow' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PricingSettings() {
  const { pricing, setPricing } = useSettingsStore();
  const [local, setLocal] = useState(() => ({
    ...pricing,
    itemPrices: { ...pricing.itemPrices },
  }));
  const [saved, setSaved] = useState(false);

  function setPercentage(
    field: 'vatPercent' | 'profitMarginPercent' | 'contingencyPercent',
    val: number,
  ) {
    setLocal((prev) => ({ ...prev, [field]: val }));
  }

  function setItemPrice(key: string, val: number) {
    setLocal((prev) => ({
      ...prev,
      itemPrices: { ...prev.itemPrices, [key]: val },
    }));
  }

  function handleSave() {
    setPricing(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  }

  function handleReset() {
    if (window.confirm('איפוס כל מחירי הפריטים לברירת המחדל?')) {
      setLocal((prev) => ({ ...prev, itemPrices: { ...DEFAULT_ITEM_PRICES } }));
    }
  }

  // Count items whose price differs from the default
  const changedCount = Object.entries(local.itemPrices).filter(
    ([k, v]) => DEFAULT_ITEM_PRICES[k] !== undefined && v !== DEFAULT_ITEM_PRICES[k],
  ).length;

  return (
    <div className="page-container">
      <h1 className="page-title mb-1">מחירון</h1>
      <p className="page-subtitle">עדכן את בסיס המחירים לכל הצעות המחיר</p>

      {/* Explanation */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl mb-5">
        <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 leading-relaxed">
          המחירון הזה הוא בסיס החישוב של כל הצעת מחיר חדשה. ניתן לשנות מחיר לכל פריט
          לפי שיטת התמחור שלו. פריטים קיימים בפרויקטים שכבר נוצרו לא ישתנו אוטומטית.
        </p>
      </div>

      {/* Success / unsaved alerts */}
      {saved && (
        <Alert variant="success" icon={<CheckCircle size={16} />} className="mb-4">
          המחירון נשמר בהצלחה! הצעות מחיר חדשות ישתמשו במחירים המעודכנים.
        </Alert>
      )}
      {changedCount > 0 && !saved && (
        <Alert variant="warning" className="mb-4">
          {changedCount} מחירים שונו ועדיין לא נשמרו — לחץ ״שמור מחירון״ כדי שהשינויים ייכנסו לתוקף.
        </Alert>
      )}

      {/* ── Percentages card ──────────────────────────────────── */}
      <Card className="mb-5">
        <CardHeader>
          <span className="font-bold text-slate-800">אחוזי חישוב</span>
          <span className="text-xs text-gray-400">חלים על כל הצעות המחיר</span>
        </CardHeader>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { field: 'vatPercent',           label: 'מע"מ %',         hint: '18% כיום בישראל' },
              { field: 'profitMarginPercent',   label: 'רווח קבלן %',   hint: 'על עלות העבודות' },
              { field: 'contingencyPercent',    label: 'בלת"מ %',       hint: 'הוצאות בלתי צפויות' },
            ] as const).map(({ field, label, hint }) => (
              <div key={field} className="form-group">
                <label className="label">{label}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={local[field]}
                    onChange={(e) => setPercentage(field, Number(e.target.value))}
                    min={0}
                    max={100}
                    step={0.5}
                    className="input pl-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                    %
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">{hint}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Per-category item prices ──────────────────────────── */}
      {WORK_CATEGORIES.map((cat) => (
        <Card key={cat.id} className="mb-4 overflow-hidden">
          {/* Category header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800">
            <span className="font-bold text-white text-sm">{cat.name}</span>
            <span className="text-white/40 text-xs">{cat.items.length} פריטים</span>
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-2.5 text-right text-xs font-bold text-gray-400 uppercase tracking-wide">
                    פריט עבודה
                  </th>
                  <th className="w-28 px-3 py-2.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                    יחידה
                  </th>
                  <th className="w-24 px-3 py-2.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                    סוג עלות
                  </th>
                  <th className="w-52 px-4 py-2.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                    מחיר
                  </th>
                  <th className="w-20 px-3 py-2.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                    סטטוס
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cat.items.map((item) => {
                  const defaultPrice = DEFAULT_ITEM_PRICES[item.defaultPriceKey] ?? 0;
                  const currentPrice = local.itemPrices[item.defaultPriceKey] ?? defaultPrice;
                  const changed = currentPrice !== defaultPrice;
                  const cost = COST_META[item.costType];
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        changed ? 'bg-amber-50/50' : 'hover:bg-gray-50/60'
                      }`}
                    >
                      {/* Item name */}
                      <td className="px-5 py-3">
                        <span className={`font-semibold text-sm ${changed ? 'text-amber-900' : 'text-slate-800'}`}>
                          {item.name}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {UNIT_LABELS[item.defaultUnit]}
                        </span>
                      </td>

                      {/* Cost type */}
                      <td className="px-3 py-3 text-center">
                        <Badge variant={cost?.variant ?? 'gray'}>{cost?.text ?? item.costType}</Badge>
                      </td>

                      {/* Price input */}
                      <td className="px-4 py-3">
                        <div className="text-[10px] text-gray-400 font-bold text-center mb-1 uppercase tracking-wide">
                          {PRICE_LABEL[item.defaultUnit] ?? 'מחיר'}
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            value={currentPrice}
                            onChange={(e) =>
                              setItemPrice(item.defaultPriceKey, Number(e.target.value))
                            }
                            min={0}
                            className={`input text-sm text-center py-2 pl-8 ${
                              changed
                                ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-400 bg-amber-50/40'
                                : ''
                            }`}
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                            ₪
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        {changed ? (
                          <span className="text-xs font-bold text-amber-600">● שונה</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile stacked list ── */}
          <div className="md:hidden divide-y divide-gray-100">
            {cat.items.map((item) => {
              const defaultPrice = DEFAULT_ITEM_PRICES[item.defaultPriceKey] ?? 0;
              const currentPrice = local.itemPrices[item.defaultPriceKey] ?? defaultPrice;
              const changed = currentPrice !== defaultPrice;
              const cost = COST_META[item.costType];
              return (
                <div
                  key={item.id}
                  className={`px-4 py-3.5 ${changed ? 'bg-amber-50/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: item info */}
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm leading-tight ${changed ? 'text-amber-900' : 'text-slate-800'}`}>
                        {item.name}
                      </div>
                      <div className="flex items-center flex-wrap gap-2 mt-1.5">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {UNIT_LABELS[item.defaultUnit]}
                        </span>
                        <Badge variant={cost?.variant ?? 'gray'}>{cost?.text}</Badge>
                        {changed && (
                          <span className="text-xs font-bold text-amber-600">● שונה</span>
                        )}
                      </div>
                    </div>

                    {/* Right: price input */}
                    <div className="flex-shrink-0 w-36">
                      <div className="text-[10px] text-gray-400 font-bold text-center mb-1 uppercase tracking-wide">
                        {PRICE_LABEL[item.defaultUnit]}
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={currentPrice}
                          onChange={(e) =>
                            setItemPrice(item.defaultPriceKey, Number(e.target.value))
                          }
                          min={0}
                          className={`input text-sm text-center py-2.5 pl-7 ${
                            changed
                              ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-400 bg-amber-50/40'
                              : ''
                          }`}
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                          ₪
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {/* ── Footer actions ────────────────────────────────────── */}
      <div className="flex justify-between items-center mt-2 flex-wrap gap-3 pb-6">
        <Button variant="ghost" onClick={handleReset} size="sm">
          <RefreshCw size={15} />
          איפוס לברירת מחדל
        </Button>
        <Button size="lg" onClick={handleSave}>
          <Save size={18} />
          שמור מחירון
          {changedCount > 0 && (
            <span className="bg-white/25 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {changedCount}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
