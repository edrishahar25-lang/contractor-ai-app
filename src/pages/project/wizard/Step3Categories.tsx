import { useState } from 'react';
import { ChevronDown, Check, Minus, Plus } from 'lucide-react';
import { SelectedWorkItem, WorkUnit } from '../../../types';
import { WORK_CATEGORIES } from '../../../data/workCategories';
import { formatCurrency, UNIT_LABELS } from '../../../lib/format';
import { useSettingsStore } from '../../../stores/settingsStore';

interface Props {
  selectedItems: SelectedWorkItem[];
  onChange: (items: SelectedWorkItem[]) => void;
}

// Quantity input label by unit type
const QUANTITY_LABEL: Record<string, string> = {
  sqm:      'כמות במ״ר',
  meter:    'כמות במטר רץ',
  unit:     'כמות יחידות',
  complete: 'כמות קומפלט',
  work_day: 'כמות ימי עבודה',
};

// Color-coded category indicator dots
const CAT_COLOR: Record<string, string> = {
  demolition: 'bg-orange-500',
  flooring: 'bg-amber-600',
  painting: 'bg-sky-400',
  drywall: 'bg-slate-400',
  electrical: 'bg-yellow-400',
  plumbing: 'bg-blue-500',
  kitchen: 'bg-red-400',
  bathroom: 'bg-teal-500',
  aluminum: 'bg-zinc-400',
  carpentry: 'bg-amber-800',
  ac: 'bg-cyan-400',
  garden: 'bg-green-500',
};

// ─── Preset templates ─────────────────────────────────────────────────────────

type PresetDef = {
  id: string;
  name: string;
  items: Array<{ categoryId: string; itemId: string; quantity: number }>;
};

const PRESETS: PresetDef[] = [
  {
    id: 'full_apartment',
    name: 'שיפוץ דירה קומפלט',
    items: [
      { categoryId: 'demolition', itemId: 'demo_floor', quantity: 80 },
      { categoryId: 'demolition', itemId: 'demo_bath', quantity: 1 },
      { categoryId: 'demolition', itemId: 'demo_waste', quantity: 1 },
      { categoryId: 'demolition', itemId: 'demo_container', quantity: 2 },
      { categoryId: 'flooring', itemId: 'floor_work', quantity: 80 },
      { categoryId: 'flooring', itemId: 'floor_mat', quantity: 80 },
      { categoryId: 'flooring', itemId: 'floor_level', quantity: 30 },
      { categoryId: 'painting', itemId: 'paint_general', quantity: 240 },
      { categoryId: 'painting', itemId: 'paint_ceiling', quantity: 80 },
      { categoryId: 'painting', itemId: 'paint_spackle', quantity: 120 },
      { categoryId: 'electrical', itemId: 'elec_point', quantity: 30 },
      { categoryId: 'electrical', itemId: 'elec_light', quantity: 20 },
      { categoryId: 'electrical', itemId: 'elec_panel', quantity: 1 },
      { categoryId: 'plumbing', itemId: 'plumb_water', quantity: 8 },
      { categoryId: 'plumbing', itemId: 'plumb_drain', quantity: 8 },
      { categoryId: 'bathroom', itemId: 'bath_full', quantity: 1 },
      { categoryId: 'carpentry', itemId: 'carp_inner', quantity: 5 },
    ],
  },
  {
    id: 'bathroom',
    name: 'שיפוץ חדר רחצה',
    items: [
      { categoryId: 'demolition', itemId: 'demo_bath', quantity: 1 },
      { categoryId: 'bathroom', itemId: 'bath_seal', quantity: 12 },
      { categoryId: 'bathroom', itemId: 'bath_floor', quantity: 7 },
      { categoryId: 'bathroom', itemId: 'bath_wall', quantity: 25 },
      { categoryId: 'bathroom', itemId: 'bath_sanitary', quantity: 1 },
      { categoryId: 'bathroom', itemId: 'bath_shower', quantity: 1 },
      { categoryId: 'bathroom', itemId: 'bath_cabinet', quantity: 1 },
      { categoryId: 'plumbing', itemId: 'plumb_water', quantity: 3 },
      { categoryId: 'plumbing', itemId: 'plumb_drain', quantity: 3 },
      { categoryId: 'plumbing', itemId: 'plumb_toilet', quantity: 1 },
      { categoryId: 'plumbing', itemId: 'plumb_sink', quantity: 1 },
    ],
  },
  {
    id: 'kitchen',
    name: 'שיפוץ מטבח',
    items: [
      { categoryId: 'demolition', itemId: 'demo_kitchen', quantity: 1 },
      { categoryId: 'demolition', itemId: 'demo_waste', quantity: 1 },
      { categoryId: 'kitchen', itemId: 'kitch_cabinets', quantity: 1 },
      { categoryId: 'kitchen', itemId: 'kitch_marble', quantity: 3 },
      { categoryId: 'kitchen', itemId: 'kitch_sink', quantity: 1 },
      { categoryId: 'kitchen', itemId: 'kitch_tap', quantity: 1 },
      { categoryId: 'kitchen', itemId: 'kitch_tiles', quantity: 12 },
      { categoryId: 'kitchen', itemId: 'kitch_elec', quantity: 8 },
      { categoryId: 'plumbing', itemId: 'plumb_dish', quantity: 1 },
      { categoryId: 'plumbing', itemId: 'plumb_wash', quantity: 1 },
    ],
  },
  {
    id: 'paint_only',
    name: 'צבע בלבד',
    items: [
      { categoryId: 'painting', itemId: 'paint_general', quantity: 240 },
      { categoryId: 'painting', itemId: 'paint_ceiling', quantity: 80 },
      { categoryId: 'painting', itemId: 'paint_spackle', quantity: 120 },
    ],
  },
  {
    id: 'drywall_work',
    name: 'עבודות גבס',
    items: [
      { categoryId: 'drywall', itemId: 'dry_walls', quantity: 30 },
      { categoryId: 'drywall', itemId: 'dry_ceiling', quantity: 50 },
      { categoryId: 'drywall', itemId: 'dry_lower', quantity: 20 },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Step3Categories({ selectedItems, onChange }: Props) {
  const { pricing } = useSettingsStore();
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(['demolition']));
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const getItem = (categoryId: string, itemId: string) =>
    selectedItems.find((s) => s.categoryId === categoryId && s.itemId === itemId);

  function toggleItem(categoryId: string, itemId: string, priceKey: string, defaultUnit: WorkUnit) {
    const existing = getItem(categoryId, itemId);
    if (existing) {
      onChange(selectedItems.filter((s) => !(s.categoryId === categoryId && s.itemId === itemId)));
    } else {
      const unitPrice = pricing.itemPrices[priceKey] ?? 0;
      onChange([...selectedItems, { categoryId, itemId, quantity: 1, unit: defaultUnit, unitPrice, notes: '' }]);
    }
    setActivePreset(null);
  }

  function updateItem(
    categoryId: string,
    itemId: string,
    patch: Partial<Pick<SelectedWorkItem, 'quantity' | 'unitPrice' | 'notes'>>,
  ) {
    onChange(
      selectedItems.map((s) =>
        s.categoryId === categoryId && s.itemId === itemId ? { ...s, ...patch } : s,
      ),
    );
  }

  function toggleCat(catId: string) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  }

  function applyPreset(preset: PresetDef) {
    const newItems: SelectedWorkItem[] = preset.items.flatMap(({ categoryId, itemId, quantity }) => {
      const cat = WORK_CATEGORIES.find((c) => c.id === categoryId);
      const workItem = cat?.items.find((i) => i.id === itemId);
      if (!workItem) return [];
      const unitPrice = pricing.itemPrices[workItem.defaultPriceKey] ?? 0;
      return [{ categoryId, itemId, quantity, unit: workItem.defaultUnit, unitPrice, notes: '' }];
    });
    onChange(newItems);
    setActivePreset(preset.id);
    setOpenCats(new Set(preset.items.map((i) => i.categoryId)));
  }

  // Refresh all selected item prices to match the current saved price list
  function updateAllPrices() {
    const updated = selectedItems.map((sel) => {
      const cat = WORK_CATEGORIES.find((c) => c.id === sel.categoryId);
      const workItem = cat?.items.find((i) => i.id === sel.itemId);
      if (!workItem) return sel;
      const newPrice = pricing.itemPrices[workItem.defaultPriceKey] ?? sel.unitPrice;
      return { ...sel, unitPrice: newPrice };
    });
    onChange(updated);
    setActivePreset(null);
  }

  const rawTotal = selectedItems.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);
  const itemCount = selectedItems.length;
  const catCount = new Set(selectedItems.map((s) => s.categoryId)).size;

  return (
    <div>
      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        {/* Items selected */}
        <div
          className={`rounded-2xl border p-3.5 text-center transition-all duration-200 ${
            itemCount > 0
              ? 'bg-slate-900 border-slate-800 shadow-card-md'
              : 'bg-white border-gray-100 shadow-sm'
          }`}
        >
          <div
            className={`text-3xl font-black leading-none mb-1 ${
              itemCount > 0 ? 'text-amber-400' : 'text-gray-200'
            }`}
          >
            {itemCount}
          </div>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${itemCount > 0 ? 'text-white/40' : 'text-gray-400'}`}>
            פריטים
          </div>
        </div>

        {/* Raw subtotal */}
        <div
          className={`rounded-2xl border p-3.5 text-center transition-all duration-200 ${
            rawTotal > 0
              ? 'bg-amber-50 border-amber-200 shadow-sm'
              : 'bg-white border-gray-100 shadow-sm'
          }`}
        >
          <div
            className={`text-sm font-black leading-none mb-1 truncate ${
              rawTotal > 0 ? 'text-amber-700' : 'text-gray-200'
            }`}
          >
            {rawTotal > 0 ? formatCurrency(rawTotal) : '—'}
          </div>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${rawTotal > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
            עלות בסיסית
          </div>
        </div>

        {/* Categories with selection */}
        <div
          className={`rounded-2xl border p-3.5 text-center transition-all duration-200 ${
            catCount > 0
              ? 'bg-green-50 border-green-200 shadow-sm'
              : 'bg-white border-gray-100 shadow-sm'
          }`}
        >
          <div
            className={`text-3xl font-black leading-none mb-1 ${
              catCount > 0 ? 'text-green-600' : 'text-gray-200'
            }`}
          >
            {catCount}
          </div>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${catCount > 0 ? 'text-green-500' : 'text-gray-400'}`}>
            קטגוריות
          </div>
        </div>
      </div>

      {/* Preset templates + price-sync action */}
      <div className="mb-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">תבניות מהירות</div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                activePreset === preset.id
                  ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-sm'
                  : 'border-gray-200 text-gray-600 bg-white hover:border-amber-300 hover:text-amber-600'
              }`}
            >
              {preset.name}
            </button>
          ))}
          {itemCount > 0 && (
            <>
              <button
                type="button"
                onClick={updateAllPrices}
                title="החלף מחירי פריטים נבחרים במחירים הנוכחיים מהמחירון"
                className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border border-blue-200 text-blue-600 bg-white hover:bg-blue-50 transition-all"
              >
                ↺ עדכן לפי מחירון נוכחי
              </button>
              <button
                type="button"
                onClick={() => { onChange([]); setActivePreset(null); }}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-500 bg-white hover:bg-red-50 transition-all"
              >
                נקה הכל
              </button>
            </>
          )}
        </div>
      </div>

      {/* Category accordions */}
      <div className="space-y-2">
        {WORK_CATEGORIES.map((cat) => {
          const open = openCats.has(cat.id);
          const catSel = selectedItems.filter((s) => s.categoryId === cat.id);
          const catTotal = catSel.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);
          const colorDot = CAT_COLOR[cat.id] ?? 'bg-gray-400';
          const hasSelected = catSel.length > 0;

          return (
            <div
              key={cat.id}
              className={`rounded-2xl overflow-hidden border transition-all duration-200 ${
                open
                  ? 'border-slate-700 shadow-card-md'
                  : hasSelected
                  ? 'border-amber-300 shadow-card-md'
                  : 'border-gray-200 shadow-sm'
              }`}
            >
              {/* Header */}
              <button
                type="button"
                onClick={() => toggleCat(cat.id)}
                className={`w-full flex items-center justify-between px-4 py-4 text-right transition-colors ${
                  open
                    ? 'bg-slate-900'
                    : hasSelected
                    ? 'bg-amber-50 hover:bg-amber-100/80'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${colorDot} ${open ? 'shadow-sm' : ''}`} />
                  <span className={`font-bold text-sm ${open ? 'text-white' : hasSelected ? 'text-amber-900' : 'text-slate-700'}`}>
                    {cat.name}
                  </span>
                  {hasSelected && (
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                        open ? 'bg-amber-400 text-slate-900' : 'bg-amber-500 text-white'
                      }`}
                    >
                      {catSel.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {catTotal > 0 && (
                    <span className={`font-bold text-sm ${open ? 'text-amber-400' : 'text-amber-700'}`}>
                      {formatCurrency(catTotal)}
                    </span>
                  )}
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-250 flex-shrink-0 ${
                      open ? 'rotate-180 text-white/40' : hasSelected ? 'text-amber-500' : 'text-gray-400'
                    }`}
                  />
                </div>
              </button>

              {/* Items body — CSS grid accordion animation */}
              <div className={`accordion-body ${open ? 'open' : 'closed'}`}>
                <div className="accordion-inner">
                <div className="bg-white">
                  {/* ── Mobile layout ── */}
                  <div className="lg:hidden divide-y divide-gray-100">
                    {cat.items.map((item) => {
                      const sel = getItem(cat.id, item.id);
                      const selected = !!sel;
                      return (
                        <div
                          key={item.id}
                          className={`p-4 transition-colors ${selected ? 'bg-amber-50/40' : ''}`}
                        >
                          {/* Row: checkbox + name + total */}
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                toggleItem(cat.id, item.id, item.defaultPriceKey, item.defaultUnit)
                              }
                              className={`mt-0.5 w-7 h-7 rounded-xl border-2 flex-shrink-0 flex items-center justify-center transition-all active:scale-95 ${
                                selected
                                  ? 'bg-amber-500 border-amber-500 shadow-sm'
                                  : 'border-gray-300 bg-white hover:border-amber-400'
                              }`}
                            >
                              {selected && <Check size={14} className="text-white" strokeWidth={3} />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div
                                className={`text-sm font-semibold leading-tight ${
                                  selected ? 'text-slate-800' : 'text-gray-500'
                                }`}
                              >
                                {item.name}
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {UNIT_LABELS[item.defaultUnit]}
                                {sel ? ` · ₪${sel.unitPrice}/יח׳` : ` · ₪${pricing.itemPrices[item.defaultPriceKey] ?? 0}/יח׳`}
                              </div>
                            </div>
                            {selected && sel && (
                              <div className="text-sm font-bold text-slate-900 flex-shrink-0">
                                {formatCurrency(sel.quantity * sel.unitPrice)}
                              </div>
                            )}
                          </div>

                          {/* Expanded controls */}
                          {selected && sel && (
                            <div className="flex items-end gap-3 mt-3 pr-9">
                              {/* +/- Quantity stepper */}
                              <div>
                                <div className="text-xs text-gray-400 mb-1.5 font-medium">
                                  {QUANTITY_LABEL[item.defaultUnit] ?? 'כמות'}
                                </div>
                                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateItem(cat.id, item.id, {
                                        quantity: Math.max(0, sel.quantity - 1),
                                      })
                                    }
                                    className="w-11 h-11 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors"
                                  >
                                    <Minus size={14} className="text-slate-600" />
                                  </button>
                                  <input
                                    type="number"
                                    value={sel.quantity || ''}
                                    onChange={(e) =>
                                      updateItem(cat.id, item.id, { quantity: Number(e.target.value) })
                                    }
                                    min={0}
                                    className="w-14 h-11 text-center font-bold text-sm bg-white border-x border-gray-200 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateItem(cat.id, item.id, { quantity: sel.quantity + 1 })
                                    }
                                    className="w-11 h-11 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 flex items-center justify-center transition-colors"
                                  >
                                    <Plus size={14} className="text-white" />
                                  </button>
                                </div>
                              </div>
                              {/* Unit price */}
                              <div className="flex-1">
                                <div className="text-xs text-gray-400 mb-1.5 font-medium">₪ / יחידה</div>
                                <input
                                  type="number"
                                  value={sel.unitPrice || ''}
                                  onChange={(e) =>
                                    updateItem(cat.id, item.id, { unitPrice: Number(e.target.value) })
                                  }
                                  min={0}
                                  className="input h-11 text-sm text-center w-full"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Desktop table ── */}
                  <div className="hidden lg:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="w-12 px-4 py-2.5" />
                          <th className="px-3 py-2.5 text-right text-xs font-bold text-gray-400 uppercase tracking-wide">
                            פריט
                          </th>
                          <th className="w-48 px-3 py-2.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                            כמות
                          </th>
                          <th className="w-20 px-3 py-2.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                            יחידה
                          </th>
                          <th className="w-32 px-3 py-2.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                            ₪ / יח׳
                          </th>
                          <th className="w-28 px-3 py-2.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">
                            סה"כ
                          </th>
                          <th className="w-32 px-3 py-2.5 text-right text-xs font-bold text-gray-400 uppercase tracking-wide">
                            הערות
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {cat.items.map((item) => {
                          const sel = getItem(cat.id, item.id);
                          const selected = !!sel;
                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors ${selected ? 'bg-amber-50/30' : 'hover:bg-gray-50/60'}`}
                            >
                              {/* Checkbox */}
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleItem(cat.id, item.id, item.defaultPriceKey, item.defaultUnit)
                                  }
                                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all mx-auto ${
                                    selected
                                      ? 'bg-amber-500 border-amber-500'
                                      : 'border-gray-300 hover:border-amber-400 bg-white'
                                  }`}
                                >
                                  {selected && <Check size={13} className="text-white" strokeWidth={3} />}
                                </button>
                              </td>
                              {/* Name */}
                              <td className="px-3 py-3">
                                <span className={`font-medium ${selected ? 'text-slate-800' : 'text-gray-400'}`}>
                                  {item.name}
                                </span>
                              </td>
                              {/* Quantity stepper */}
                              <td className="px-3 py-3">
                                <div className="text-[10px] text-gray-400 text-center mb-1 font-medium">
                                  {QUANTITY_LABEL[item.defaultUnit] ?? 'כמות'}
                                </div>
                                {selected && sel ? (
                                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden w-fit mx-auto">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateItem(cat.id, item.id, {
                                          quantity: Math.max(0, sel.quantity - 1),
                                        })
                                      }
                                      className="w-9 h-9 bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors"
                                    >
                                      <Minus size={13} className="text-slate-600" />
                                    </button>
                                    <input
                                      type="number"
                                      value={sel.quantity || ''}
                                      onChange={(e) =>
                                        updateItem(cat.id, item.id, { quantity: Number(e.target.value) })
                                      }
                                      min={0}
                                      className="w-14 h-9 text-center font-bold text-sm bg-white border-x border-gray-200 focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateItem(cat.id, item.id, { quantity: sel.quantity + 1 })
                                      }
                                      className="w-9 h-9 bg-amber-500 hover:bg-amber-400 flex items-center justify-center transition-colors"
                                    >
                                      <Plus size={13} className="text-white" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-300 block text-center text-xs">—</span>
                                )}
                              </td>
                              {/* Unit */}
                              <td className="px-3 py-3 text-center">
                                <span className="text-xs text-gray-400">{UNIT_LABELS[item.defaultUnit]}</span>
                              </td>
                              {/* Unit price */}
                              <td className="px-3 py-3">
                                {selected && sel ? (
                                  <input
                                    type="number"
                                    value={sel.unitPrice || ''}
                                    onChange={(e) =>
                                      updateItem(cat.id, item.id, { unitPrice: Number(e.target.value) })
                                    }
                                    min={0}
                                    className="input text-sm text-center py-1.5 w-full"
                                  />
                                ) : (
                                  <span className="text-gray-300 block text-center text-xs">
                                    ₪{pricing.itemPrices[item.defaultPriceKey] ?? 0}
                                  </span>
                                )}
                              </td>
                              {/* Line total */}
                              <td className="px-3 py-3 text-left">
                                {selected && sel ? (
                                  <span className="font-bold text-slate-900">
                                    {formatCurrency(sel.quantity * sel.unitPrice)}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              {/* Notes */}
                              <td className="px-3 py-3">
                                <input
                                  type="text"
                                  value={sel?.notes || ''}
                                  onChange={(e) =>
                                    updateItem(cat.id, item.id, { notes: e.target.value })
                                  }
                                  disabled={!selected}
                                  className="input text-xs py-1.5 disabled:opacity-0"
                                  placeholder="הערה..."
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
