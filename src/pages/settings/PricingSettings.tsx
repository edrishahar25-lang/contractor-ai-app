import { useState } from 'react';
import { Save, CheckCircle, RefreshCw, Info, TrendingUp, Plus, Trash2 } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { DEFAULT_ITEM_PRICES, BASELINE_PRICE_PER_SQM } from '../../lib/pricingEngine';
import { Button, Card, CardHeader, Alert, Badge } from '../../components/ui';
import { WORK_CATEGORIES } from '../../data/workCategories';
import { UNIT_LABELS } from '../../lib/format';
import type { CalibrationDeal } from '../../types';

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
    itemSplit: { ...(pricing.itemSplit ?? {}) },
    priceMultiplier: pricing.priceMultiplier ?? 1.0,
    calibrationDeals: pricing.calibrationDeals ?? [],
  }));
  const [saved, setSaved] = useState(false);

  // ── Calibration helpers ───────────────────────────────────────────────────

  const deals = local.calibrationDeals ?? [];

  function addDeal() {
    setLocal((p) => ({
      ...p,
      calibrationDeals: [...(p.calibrationDeals ?? []), { label: '', sqm: 100, totalPrice: 0 }],
    }));
  }

  function updateDeal(i: number, patch: Partial<CalibrationDeal>) {
    setLocal((p) => {
      const next = [...(p.calibrationDeals ?? [])];
      next[i] = { ...next[i], ...patch };
      return { ...p, calibrationDeals: next };
    });
  }

  function removeDeal(i: number) {
    setLocal((p) => ({
      ...p,
      calibrationDeals: (p.calibrationDeals ?? []).filter((_, idx) => idx !== i),
    }));
  }

  function applyCalibration() {
    const validDeals = deals.filter((d) => d.sqm > 0 && d.totalPrice > 0);
    if (validDeals.length === 0) return;
    const totalSqm = validDeals.reduce((s, d) => s + d.sqm, 0);
    const totalPrice = validDeals.reduce((s, d) => s + d.totalPrice, 0);
    const avgPerSqm = totalPrice / totalSqm;
    const multiplier = parseFloat((avgPerSqm / BASELINE_PRICE_PER_SQM).toFixed(3));
    setLocal((p) => ({ ...p, priceMultiplier: Math.max(0.3, Math.min(5, multiplier)) }));
  }

  const validDeals = deals.filter((d) => d.sqm > 0 && d.totalPrice > 0);
  const calibAvgPerSqm = validDeals.length > 0
    ? Math.round(validDeals.reduce((s, d) => s + d.totalPrice, 0) / validDeals.reduce((s, d) => s + d.sqm, 0))
    : null;
  const currentMultiplier = local.priceMultiplier ?? 1.0;

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

  function setItemSplit(itemId: string, field: 'material' | 'labor', val: number) {
    setLocal((prev) => {
      const existing = prev.itemSplit?.[itemId] ?? { material: 0, labor: 0, wasteFactor: 0 };
      const next = { ...existing, [field]: val };
      // Keep itemPrices in sync for backward compat
      const priceKey = WORK_CATEGORIES.flatMap((c) => c.items).find((i) => i.id === itemId)?.defaultPriceKey;
      const newItemPrices = priceKey
        ? { ...prev.itemPrices, [priceKey]: next.material + next.labor }
        : prev.itemPrices;
      return {
        ...prev,
        itemSplit: { ...(prev.itemSplit ?? {}), [itemId]: next },
        itemPrices: newItemPrices,
      };
    });
  }

  function handleSave() {
    setPricing({
      ...local,
      itemSplit: local.itemSplit ?? {},
      priceMultiplier: local.priceMultiplier ?? 1.0,
      calibrationDeals: local.calibrationDeals ?? [],
    });
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
        <div>
          <p className="text-sm text-blue-800 leading-relaxed font-semibold mb-1">
            המחירון מחולק לעלות חומר ועלות עבודה.
          </p>
          <p className="text-sm text-blue-700 leading-relaxed">
            החישובים בהצעות המחיר מבוססים על שתי העלויות בנפרד כדי להציג רווחיות אמיתית.
            עריכת עמודות חומר/עבודה תשפר את דיוק הניתוח. פריטים קיימים בפרויקטים שכבר נוצרו לא ישתנו אוטומטית.
          </p>
        </div>
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

      {/* ── Calibration card ──────────────────────────────────── */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-500" />
            <span className="font-bold text-slate-800">כיול מחירים לפי עסקאות שלך</span>
          </div>
          <span className="text-xs text-gray-400">
            המחירים יוכפלו בגורם כיול כך שיתאימו לרמת התמחור שלך
          </span>
        </CardHeader>
        <div className="p-5">
          {/* Current multiplier banner */}
          {currentMultiplier !== 1.0 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold mb-4 ${
              currentMultiplier > 1 ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              <TrendingUp size={14} />
              מחירון מכוייל: כל המחירים × {currentMultiplier.toFixed(2)}
              ({currentMultiplier > 1 ? '+' : ''}{Math.round((currentMultiplier - 1) * 100)}% מהבסיס)
              <button
                className="mr-auto text-xs underline opacity-60 hover:opacity-100"
                onClick={() => setLocal((p) => ({ ...p, priceMultiplier: 1.0 }))}
              >
                אפס
              </button>
            </div>
          )}

          <p className="text-sm text-gray-600 mb-3">
            הזן 1-3 פרויקטים שסיימת (ללא מע"מ) כדי לחשב את הגורם שמתאים לרמת המחירים שלך:
          </p>

          {/* Deals table */}
          <div className="space-y-2 mb-3">
            {deals.map((deal, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className="input flex-1 text-sm"
                  placeholder="תיאור (אופציונלי)"
                  value={deal.label}
                  onChange={(e) => updateDeal(i, { label: e.target.value })}
                />
                <div className="relative w-24 flex-shrink-0">
                  <input
                    type="number" min={1} className="input text-sm text-center pl-8"
                    placeholder="מ״ר"
                    value={deal.sqm || ''}
                    onChange={(e) => updateDeal(i, { sqm: Number(e.target.value) })}
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">מ״ר</span>
                </div>
                <div className="relative w-32 flex-shrink-0">
                  <input
                    type="number" min={0} className="input text-sm text-center pl-7"
                    placeholder="עלות ₪"
                    value={deal.totalPrice || ''}
                    onChange={(e) => updateDeal(i, { totalPrice: Number(e.target.value) })}
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₪</span>
                </div>
                <button onClick={() => removeDeal(i)} className="p-1.5 text-red-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {deals.length < 5 && (
              <button onClick={addDeal} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700">
                <Plus size={14} />
                הוסף פרויקט
              </button>
            )}

            {calibAvgPerSqm !== null && (
              <div className="flex items-center gap-3 mr-auto flex-wrap">
                <span className="text-sm text-gray-500">
                  הממוצע שלך: <strong className="text-slate-800">₪{calibAvgPerSqm}/מ״ר</strong>
                  {' '}vs בסיס מערכת: <strong>₪{BASELINE_PRICE_PER_SQM}/מ״ר</strong>
                </span>
                <button
                  onClick={applyCalibration}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors"
                >
                  החל כיול → ×{(calibAvgPerSqm / BASELINE_PRICE_PER_SQM).toFixed(2)}
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-3">
            גורם הכיול חל על כל הצעות המחיר החדשות. פרויקטים קיימים לא מושפעים.
          </p>
        </div>
      </Card>

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
                  <th className="w-20 px-3 py-2.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                    יחידה
                  </th>
                  <th className="w-24 px-3 py-2.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                    סוג
                  </th>
                  <th className="w-32 px-3 py-2.5 text-center text-xs font-bold text-blue-400 uppercase tracking-wide">
                    חומר ₪
                  </th>
                  <th className="w-32 px-3 py-2.5 text-center text-xs font-bold text-green-500 uppercase tracking-wide">
                    עבודה ₪
                  </th>
                  <th className="w-28 px-4 py-2.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                    סה"כ
                  </th>
                  <th className="w-16 px-3 py-2.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                    סטטוס
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cat.items.map((item) => {
                  const defaultPrice = DEFAULT_ITEM_PRICES[item.defaultPriceKey] ?? 0;
                  const currentTotal = local.itemPrices[item.defaultPriceKey] ?? defaultPrice;
                  const splitEntry = local.itemSplit?.[item.id];
                  const matVal = splitEntry?.material ?? (item.costType === 'material' ? currentTotal : item.costType === 'labor' ? 0 : Math.round(currentTotal * 0.4));
                  const labVal = splitEntry?.labor ?? (item.costType === 'labor' ? currentTotal : item.costType === 'material' ? 0 : Math.round(currentTotal * 0.6));
                  const computedTotal = splitEntry ? splitEntry.material + splitEntry.labor : currentTotal;
                  const changed = currentTotal !== defaultPrice || !!splitEntry;
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

                      {/* Material cost */}
                      <td className="px-3 py-3">
                        <div className="relative">
                          <input
                            type="number"
                            value={matVal}
                            onChange={(e) => setItemSplit(item.id, 'material', Number(e.target.value))}
                            min={0}
                            disabled={item.costType === 'labor'}
                            className="input text-sm text-center py-2 pl-7 text-blue-700 border-blue-200 focus:border-blue-400 disabled:opacity-30"
                          />
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-400 text-xs pointer-events-none">₪</span>
                        </div>
                      </td>

                      {/* Labor cost */}
                      <td className="px-3 py-3">
                        <div className="relative">
                          <input
                            type="number"
                            value={labVal}
                            onChange={(e) => setItemSplit(item.id, 'labor', Number(e.target.value))}
                            min={0}
                            disabled={item.costType === 'material'}
                            className="input text-sm text-center py-2 pl-7 text-green-700 border-green-200 focus:border-green-400 disabled:opacity-30"
                          />
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-green-400 text-xs pointer-events-none">₪</span>
                        </div>
                      </td>

                      {/* Computed total */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-slate-900 text-sm">₪{computedTotal}</span>
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
