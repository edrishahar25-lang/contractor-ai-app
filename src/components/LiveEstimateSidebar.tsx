import { Clock, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { SelectedWorkItem, Property } from '../types';
import { useSettingsStore } from '../stores/settingsStore';
import { calculateEstimate } from '../lib/pricingEngine';
import { formatCurrency } from '../lib/format';

interface Props {
  selectedItems: SelectedWorkItem[];
  property: Property;
}

export default function LiveEstimateSidebar({ selectedItems, property }: Props) {
  const { pricing, company } = useSettingsStore();

  const hasItems = selectedItems.length > 0;
  const estimate = hasItems
    ? calculateEstimate(selectedItems, property, pricing, company)
    : null;

  const rawTotal = selectedItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const isHighValue = estimate ? estimate.total > 150000 : false;
  const isVeryHighValue = estimate ? estimate.total > 250000 : false;

  const totalColor = isVeryHighValue ? '#ff4d1a' : isHighValue ? '#e8a020' : '#c9a227';

  return (
    <div className="sticky top-6 space-y-3">
      {/* Hero total card */}
      <div
        className={`rounded-2xl px-5 py-5 text-center shadow-card-md transition-all duration-300 ${
          isHighValue ? 'ring-2 ring-amber-500/40' : ''
        }`}
        style={{ background: 'linear-gradient(150deg, #0f1b2d 0%, #1a2d4a 100%)' }}
      >
        <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">
          סה״כ כולל מע״מ
        </div>

        {!hasItems ? (
          <div className="py-1 space-y-2">
            <div className="skeleton-dark h-9 w-36 mx-auto rounded-xl" />
            <div className="skeleton-dark h-3 w-24 mx-auto rounded" />
          </div>
        ) : (
          <>
            <div
              className="text-4xl font-black leading-tight mb-1 transition-all duration-300"
              style={{ color: estimate ? totalColor : 'rgba(255,255,255,0.2)' }}
            >
              {estimate ? formatCurrency(estimate.total) : '—'}
            </div>
            {estimate && (
              <div className="text-white/30 text-xs">{formatCurrency(estimate.beforeVAT)} לפני מע״מ</div>
            )}
          </>
        )}
      </div>

      {/* Breakdown card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
        {/* Section header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800">
          <Zap size={11} className="text-amber-400" />
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
            פירוט חישוב
          </span>
        </div>

        <div className="divide-y divide-gray-50">
          <SidebarRow
            label="פריטים נבחרים"
            value={hasItems ? String(selectedItems.length) : '—'}
            accent="slate"
            bold
          />

          <SidebarRow
            label="עלות בסיסית"
            value={rawTotal > 0 ? formatCurrency(rawTotal) : '—'}
            accent="slate"
            loading={!hasItems}
          />

          {estimate && (estimate.difficultyAddition !== 0 || estimate.finishAddition !== 0) && (
            <SidebarRow
              label="תוספות קושי / גמר"
              value={`+${formatCurrency(estimate.difficultyAddition + estimate.finishAddition)}`}
              accent="amber"
            />
          )}

          <SidebarRow
            label={`רווח קבלן (${pricing.profitMarginPercent}%)`}
            value={estimate ? formatCurrency(estimate.profitAmount) : '—'}
            accent="green"
            loading={!hasItems}
          />

          <SidebarRow
            label={`בלת״מ (${pricing.contingencyPercent}%)`}
            value={estimate ? formatCurrency(estimate.contingencyAmount) : '—'}
            accent="orange"
            loading={!hasItems}
          />

          {/* Before VAT divider row */}
          {estimate && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80">
              <span className="text-xs font-bold text-slate-600">לפני מע״מ</span>
              <span className="text-sm font-extrabold text-slate-800">
                {formatCurrency(estimate.beforeVAT)}
              </span>
            </div>
          )}

          <SidebarRow
            label={`מע״מ (${estimate?.vatPercent ?? pricing.vatPercent}%)`}
            value={estimate ? formatCurrency(estimate.vatAmount) : '—'}
            accent="blue"
            loading={!hasItems}
          />

          {/* Labor days */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50/60">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock size={12} />
              <span className="text-xs">ימי עבודה מוערכים</span>
            </div>
            {!hasItems ? (
              <div className="skeleton h-4 w-12 rounded" />
            ) : (
              <span className="font-bold text-slate-800 text-sm">
                {estimate?.estimatedLaborDays ?? 0} ימים
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grand total row */}
      {estimate && (
        <div
          className="rounded-2xl px-4 py-3.5 flex items-center justify-between transition-all duration-300"
          style={{
            background: isVeryHighValue
              ? 'linear-gradient(135deg, #1e0800 0%, #3d1000 100%)'
              : isHighValue
              ? 'linear-gradient(135deg, #140c00 0%, #2a1a00 100%)'
              : '#0f1b2d',
          }}
        >
          <div className="flex items-center gap-2 text-white/50">
            <TrendingUp size={14} />
            <span className="text-xs font-semibold">סה״כ סופי</span>
          </div>
          <span className="font-black text-lg" style={{ color: totalColor }}>
            {formatCurrency(estimate.total)}
          </span>
        </div>
      )}

      {/* Engine warnings */}
      {estimate?.warnings && estimate.warnings.length > 0 && (
        <div className="space-y-1.5">
          {estimate.warnings.map((w, i) => (
            <div key={i} className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-snug">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* High-value notice */}
      {isHighValue && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={12} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 leading-snug">
            הצעה בסכום גבוה — מומלץ לפרט אבני דרך ותשלומים.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Accent colour map ────────────────────────────────────────────────────────

const ACCENT: Record<string, { bar: string; text: string }> = {
  slate:  { bar: 'bg-slate-400',  text: 'text-slate-700' },
  amber:  { bar: 'bg-amber-500',  text: 'text-amber-700' },
  green:  { bar: 'bg-green-500',  text: 'text-green-700' },
  orange: { bar: 'bg-orange-500', text: 'text-orange-700' },
  blue:   { bar: 'bg-blue-500',   text: 'text-blue-700' },
};

function SidebarRow({
  label,
  value,
  accent = 'slate',
  bold = false,
  loading = false,
}: {
  label: string;
  value: string;
  accent?: string;
  bold?: boolean;
  loading?: boolean;
}) {
  const { bar, text } = ACCENT[accent] ?? ACCENT.slate;
  return (
    <div className="flex items-center justify-between px-4 py-2.5 gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-1 h-3.5 rounded-full flex-shrink-0 ${bar} opacity-60`} />
        <span className="text-xs text-gray-500 truncate leading-tight">{label}</span>
      </div>
      {loading ? (
        <div className="skeleton h-4 w-16 rounded" />
      ) : (
        <span
          className={`text-sm flex-shrink-0 leading-tight ${
            bold ? 'font-extrabold' : 'font-semibold'
          } ${text}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}
