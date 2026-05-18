import { useState } from 'react';
import {
  Sparkles, MessageCircle, ClipboardList, Calculator,
  ShoppingCart, FileText, ChevronDown, ChevronUp,
  Copy, Check, Loader, AlertCircle, Printer,
  Shield, TrendingUp, Bell, BarChart2,
} from 'lucide-react';
import type { Project, EstimateVersion, CompanySettings, PricingSettings } from '../../types';
import { WORK_CATEGORIES } from '../../data/workCategories';
import { PROPERTY_TYPE_LABELS, formatCurrency } from '../../lib/format';
import { israeliPhoneToIntl } from '../../lib/whatsapp';

// ─── Item name map ────────────────────────────────────────────────────────────

const ITEM_MAP = new Map<string, { cat: string; name: string }>();
WORK_CATEGORIES.forEach((cat) => {
  cat.items.forEach((item) => ITEM_MAP.set(item.id, { cat: cat.name, name: item.name }));
});

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolKey = 'followup' | 'workOrders' | 'scopeChange' | 'shoppingList' | 'contract' | 'budget' | 'risk' | 'reminder' | 'competitive';

interface ToolState {
  open: boolean;
  loading: boolean;
  error: string | null;
  result: any;
}

interface Props {
  project: Project;
  version: EstimateVersion;
  company: CompanySettings;
  pricing: PricingSettings;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildItems(version: EstimateVersion) {
  return version.selectedItems.map((si) => {
    const info = ITEM_MAP.get(si.itemId) ?? { cat: si.categoryId, name: si.itemId };
    const catDef = WORK_CATEGORIES.find((c) => c.id === si.categoryId);
    const itemDef = catDef?.items.find((i) => i.id === si.itemId);
    const split = undefined as any;
    return {
      categoryName: info.cat,
      itemName: info.name,
      quantity: si.quantity,
      unit: si.unit,
      unitPrice: si.unitPrice,
      isMaterial: itemDef?.costType !== 'labor',
      wasteFactor: split?.wasteFactor ?? 10,
    };
  });
}

function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
    >
      {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
      {copied ? 'הועתק' : 'העתק'}
    </button>
  );
}

// ─── WhatsApp open ────────────────────────────────────────────────────────────

function openWhatsAppText(phone: string, text: string) {
  const intl = israeliPhoneToIntl(phone);
  const url = intl
    ? `https://wa.me/${intl}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ─── Print helper ─────────────────────────────────────────────────────────────

function printText(title: string, content: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; direction: rtl; padding: 32px; font-size: 14px; line-height: 1.7; }
      pre { white-space: pre-wrap; font-family: inherit; }
      h2 { color: #0f1b2d; }
    </style></head>
    <body><h2>${title}</h2><pre>${content}</pre></body></html>
  `);
  win.document.close();
  win.print();
}

// ─── Tool section wrapper ─────────────────────────────────────────────────────

function ToolSection({
  icon, title, description, state,
  onToggle, children,
}: {
  toolKey?: ToolKey;
  icon: React.ReactNode;
  title: string;
  description: string;
  state: ToolState;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-right"
      >
        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-slate-800">{title}</div>
          <div className="text-xs text-gray-400 truncate">{description}</div>
        </div>
        <div className="flex-shrink-0 text-gray-400">
          {state.open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {state.open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-50">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AiToolsPanel({ project, version, company }: Props) {
  const initialState: ToolState = { open: false, loading: false, error: null, result: null };
  const [states, setStates] = useState<Record<ToolKey, ToolState>>({
    followup: { ...initialState },
    workOrders: { ...initialState },
    scopeChange: { ...initialState },
    shoppingList: { ...initialState },
    contract: { ...initialState },
    budget: { ...initialState },
    risk: { ...initialState },
    reminder: { ...initialState },
    competitive: { ...initialState },
  });
  const [scopeInput, setScopeInput] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [reminderDays, setReminderDays] = useState('30');

  function toggle(key: ToolKey) {
    setStates((s) => ({ ...s, [key]: { ...s[key], open: !s[key].open } }));
  }

  function setLoading(key: ToolKey, v: boolean) {
    setStates((s) => ({ ...s, [key]: { ...s[key], loading: v, error: null } }));
  }

  function setResult(key: ToolKey, result: any) {
    setStates((s) => ({ ...s, [key]: { ...s[key], loading: false, result } }));
  }

  function setError(key: ToolKey, error: string) {
    setStates((s) => ({ ...s, [key]: { ...s[key], loading: false, error } }));
  }

  async function call(key: ToolKey, endpoint: string, body: object) {
    setLoading(key, true);
    try {
      const res = await fetch(`/api/project-ai/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `שגיאת שרת ${res.status}`);
      setResult(key, data);
    } catch (err) {
      setError(key, (err as Error).message);
    }
  }

  const items = buildItems(version);
  const propertyTypeHe = PROPERTY_TYPE_LABELS[project.property.type] ?? project.property.type;

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleFollowup() {
    call('followup', 'followup', {
      clientName: project.client.name,
      clientPhone: project.client.phone,
      address: project.client.address,
      city: project.client.city,
      propertyType: propertyTypeHe,
      totalAmount: version.result.total,
      status: project.status,
      daysSinceSent: daysSince(project.updatedAt),
      companyName: company.companyName || 'Contractor AI Pro',
      companyPhone: company.phone || '',
    });
  }

  function handleWorkOrders() {
    call('workOrders', 'work-orders', {
      clientName: project.client.name,
      address: project.client.address,
      city: project.client.city,
      propertyType: propertyTypeHe,
      totalSqm: project.property.totalSqm,
      items,
    });
  }

  function handleScopeChange() {
    if (!scopeInput.trim()) return;
    call('scopeChange', 'scope-change', {
      clientName: project.client.name,
      address: project.client.address,
      propertyType: propertyTypeHe,
      totalSqm: project.property.totalSqm,
      existingItems: items,
      originalTotal: version.result.total,
      changeDescription: scopeInput.trim(),
    });
  }

  function handleShoppingList() {
    call('shoppingList', 'shopping-list', {
      propertyType: propertyTypeHe,
      totalSqm: project.property.totalSqm,
      items,
    });
  }

  function handleBudget() {
    const budget = parseFloat(budgetInput.replace(/[^0-9.]/g, ''));
    if (!budget || budget <= 0) return;
    call('budget', 'budget', {
      budget,
      propertyType: propertyTypeHe,
      totalSqm: project.property.totalSqm,
      items,
      currentTotal: version.result.total,
    });
  }

  function handleRisk() {
    call('risk', 'risk', {
      clientName: project.client.name,
      address: project.client.address,
      city: project.client.city,
      propertyType: propertyTypeHe,
      totalSqm: project.property.totalSqm,
      condition: project.property.condition,
      totalWithVat: version.result.total,
      items,
    });
  }

  function handleReminder() {
    call('reminder', 'payment-reminder', {
      clientName: project.client.name,
      address: project.client.address,
      totalAmount: version.result.total,
      daysPastDue: parseInt(reminderDays) || 30,
      companyName: company.companyName || 'החברה',
      companyPhone: company.phone || '',
    });
  }

  function handleCompetitive() {
    call('competitive', 'competitive-intel', {
      propertyType: propertyTypeHe,
      totalSqm: project.property.totalSqm,
      finishLevel: project.property.finishLevel,
      totalBeforeVat: version.result.beforeVAT,
      items,
    });
  }

  function handleContract() {
    const paymentTerms = company.paymentTerms?.length
      ? company.paymentTerms
      : ['30% מקדמה', '40% באמצע הביצוע', '30% בסיום'];

    call('contract', 'contract', {
      clientName: project.client.name,
      clientPhone: project.client.phone,
      clientAddress: project.client.address,
      clientCity: project.client.city,
      companyName: company.companyName || '',
      companyPhone: company.phone || '',
      companyTaxId: company.taxId || '',
      address: project.client.address,
      city: project.client.city,
      propertyType: propertyTypeHe,
      totalSqm: project.property.totalSqm,
      totalBeforeVat: version.result.beforeVAT,
      totalWithVat: version.result.total,
      vatPercent: version.result.vatPercent,
      paymentTerms,
      estimatedLaborDays: version.result.estimatedLaborDays,
      workItems: items,
    });
  }

  const s = states;

  return (
    <div className="card mb-5">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-amber-500" />
          <span className="font-bold text-slate-800 text-sm">כלי AI לפרויקט</span>
        </div>
        <span className="text-xs text-gray-400">9 כלי AI לחיסכון בזמן ומניעת טעויות</span>
      </div>

      <div className="p-4 space-y-2">

        {/* ── 1. Follow-up ──────────────────────────────────────────────────── */}
        <ToolSection
          toolKey="followup"
          icon={<MessageCircle size={16} />}
          title="הודעת מעקב ללקוח"
          description="AI מנסח הודעת WhatsApp מותאמת לסטטוס הפרויקט"
          state={s.followup}
          onToggle={() => toggle('followup')}
        >
          <button
            onClick={handleFollowup}
            disabled={s.followup.loading}
            className="btn btn-primary btn-sm mt-2 mb-3"
          >
            {s.followup.loading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {s.followup.loading ? 'מייצר הודעה...' : 'צור הודעת מעקב'}
          </button>

          {s.followup.error && (
            <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 rounded-xl p-3">
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              {s.followup.error}
            </div>
          )}

          {s.followup.result?.message && (
            <div className="bg-green-50 rounded-xl p-3 border border-green-100">
              <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed mb-3">
                {s.followup.result.message}
              </p>
              <div className="flex gap-2">
                <CopyBtn text={s.followup.result.message} />
                {project.client.phone && (
                  <button
                    onClick={() => openWhatsAppText(project.client.phone, s.followup.result.message)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                  >
                    <MessageCircle size={13} />
                    שלח בוואטסאפ
                  </button>
                )}
              </div>
            </div>
          )}
        </ToolSection>

        {/* ── 2. Work orders ────────────────────────────────────────────────── */}
        <ToolSection
          toolKey="workOrders"
          icon={<ClipboardList size={16} />}
          title="פקודות עבודה לקבלני משנה"
          description="פירוט עבודה לכל בעל מקצוע — חשמלאי, אינסטלטור, רצף ועוד"
          state={s.workOrders}
          onToggle={() => toggle('workOrders')}
        >
          <button
            onClick={handleWorkOrders}
            disabled={s.workOrders.loading}
            className="btn btn-primary btn-sm mt-2 mb-3"
          >
            {s.workOrders.loading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {s.workOrders.loading ? 'מייצר פקודות...' : 'צור פקודות עבודה'}
          </button>

          {s.workOrders.error && (
            <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 rounded-xl p-3">
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              {s.workOrders.error}
            </div>
          )}

          {s.workOrders.result?.trades && (
            <div className="space-y-3">
              {s.workOrders.result.trades.map((trade: any, i: number) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3 border border-gray-100">
                  <div className="font-bold text-sm text-slate-800 mb-2">
                    {trade.tradeEmoji} {trade.tradeName}
                  </div>
                  <ul className="space-y-1.5">
                    {trade.items.map((item: any, j: number) => (
                      <li key={j} className="text-sm text-slate-700 flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5 flex-shrink-0">•</span>
                        <div>
                          <span>{item.description}</span>
                          <span className="text-gray-500 mr-1">— {item.quantity}</span>
                          {item.notes && (
                            <span className="text-amber-600 text-xs block">{item.notes}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="flex gap-2">
                <CopyBtn text={s.workOrders.result.trades
                  .map((t: any) => `${t.tradeEmoji} ${t.tradeName}\n` +
                    t.items.map((it: any) => `• ${it.description} — ${it.quantity}${it.notes ? `\n  הערה: ${it.notes}` : ''}`).join('\n'))
                  .join('\n\n')} />
                <button
                  onClick={() => printText('פקודות עבודה — ' + project.client.name,
                    s.workOrders.result.trades
                      .map((t: any) => `${t.tradeEmoji} ${t.tradeName}\n` +
                        t.items.map((it: any) => `• ${it.description} — ${it.quantity}${it.notes ? `\n  הערה: ${it.notes}` : ''}`).join('\n'))
                      .join('\n\n'))}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Printer size={13} />
                  הדפס
                </button>
              </div>
            </div>
          )}
        </ToolSection>

        {/* ── 3. Scope change ───────────────────────────────────────────────── */}
        <ToolSection
          toolKey="scopeChange"
          icon={<Calculator size={16} />}
          title="חישוב שינוי היקף"
          description="הלקוח ביקש שינוי? חשב דלתא עלות מיידית"
          state={s.scopeChange}
          onToggle={() => toggle('scopeChange')}
        >
          <div className="mt-2 mb-3">
            <label className="text-xs text-gray-500 block mb-1">תאר את השינוי המבוקש:</label>
            <textarea
              rows={3}
              value={scopeInput}
              onChange={(e) => setScopeInput(e.target.value)}
              placeholder={'למשל: הלקוח ביקש להוסיף ריצוף במרפסת שירות 12 מ"ר ולשדרג אריחי מטבח לפרימיום'}
              className="input text-sm w-full resize-none"
            />
            <button
              onClick={handleScopeChange}
              disabled={s.scopeChange.loading || !scopeInput.trim()}
              className="btn btn-primary btn-sm mt-2"
            >
              {s.scopeChange.loading ? <Loader size={14} className="animate-spin" /> : <Calculator size={14} />}
              {s.scopeChange.loading ? 'מחשב...' : 'חשב דלתא עלות'}
            </button>
          </div>

          {s.scopeChange.error && (
            <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 rounded-xl p-3">
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              {s.scopeChange.error}
            </div>
          )}

          {s.scopeChange.result?.deltaItems && (
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <p className="text-sm font-semibold text-slate-800 mb-2">{s.scopeChange.result.summary}</p>
              <div className="space-y-1 mb-3">
                {s.scopeChange.result.deltaItems.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm text-slate-700">
                    <div>
                      <span>{item.name}</span>
                      <span className="text-gray-400 mr-1 text-xs">({item.quantity} {item.unit} × ₪{item.unitPrice.toLocaleString('he-IL')})</span>
                      {item.note && <span className="text-amber-600 text-xs block">{item.note}</span>}
                    </div>
                    <span className="font-semibold">₪{item.total.toLocaleString('he-IL')}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-blue-200 pt-2 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>מע"מ</span>
                  <span>₪{s.scopeChange.result.vatAmount.toLocaleString('he-IL')}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-800">
                  <span>תוספת לתשלום</span>
                  <span className={s.scopeChange.result.deltaTotal >= 0 ? 'text-green-700' : 'text-red-600'}>
                    {s.scopeChange.result.deltaTotal >= 0 ? '+' : ''}₪{s.scopeChange.result.deltaTotal.toLocaleString('he-IL')}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-blue-200">
                  <span>סה"כ חדש כולל מע"מ</span>
                  <span className="text-amber-600">{formatCurrency(s.scopeChange.result.newGrandTotal)}</span>
                </div>
              </div>
              {s.scopeChange.result.warning && (
                <p className="text-xs text-amber-700 mt-2 bg-amber-50 rounded-lg p-2">
                  ⚠️ {s.scopeChange.result.warning}
                </p>
              )}
              <div className="mt-2">
                <CopyBtn text={
                  `שינוי היקף — ${s.scopeChange.result.summary}\n` +
                  s.scopeChange.result.deltaItems.map((it: any) => `• ${it.name}: ${it.quantity} ${it.unit} = ₪${it.total.toLocaleString('he-IL')}`).join('\n') +
                  `\nתוספת כולל מע"מ: ₪${s.scopeChange.result.deltaTotal.toLocaleString('he-IL')}\nסה"כ חדש: ₪${s.scopeChange.result.newGrandTotal.toLocaleString('he-IL')}`
                } />
              </div>
            </div>
          )}
        </ToolSection>

        {/* ── 4. Shopping list ──────────────────────────────────────────────── */}
        <ToolSection
          toolKey="shoppingList"
          icon={<ShoppingCart size={16} />}
          title="רשימת קנייה לחנויות"
          description="כמויות לקנייה לפי ספק, כולל אחוזי בזבוז"
          state={s.shoppingList}
          onToggle={() => toggle('shoppingList')}
        >
          <button
            onClick={handleShoppingList}
            disabled={s.shoppingList.loading}
            className="btn btn-primary btn-sm mt-2 mb-3"
          >
            {s.shoppingList.loading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {s.shoppingList.loading ? 'מייצר רשימה...' : 'צור רשימת קנייה'}
          </button>

          {s.shoppingList.error && (
            <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 rounded-xl p-3">
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              {s.shoppingList.error}
            </div>
          )}

          {s.shoppingList.result?.categories && (
            <div className="space-y-3">
              {s.shoppingList.result.categories.map((cat: any, i: number) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3 border border-gray-100">
                  <div className="font-bold text-sm text-slate-800 mb-2">
                    {cat.emoji} {cat.supplierType}
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {cat.items.map((item: any, j: number) => (
                        <tr key={j} className="border-b border-gray-100 last:border-0">
                          <td className="py-1 text-slate-700 pl-2">{item.name}</td>
                          <td className="py-1 text-slate-700 font-semibold text-left whitespace-nowrap">
                            {item.quantity} {item.unit}
                          </td>
                          {item.notes && (
                            <td className="py-1 text-xs text-gray-400 pr-2">{item.notes}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              <div className="flex gap-2">
                <CopyBtn text={s.shoppingList.result.categories
                  .map((cat: any) => `${cat.emoji} ${cat.supplierType}\n` +
                    cat.items.map((it: any) => `  • ${it.name}: ${it.quantity} ${it.unit}${it.notes ? ` (${it.notes})` : ''}`).join('\n'))
                  .join('\n\n')} />
                <button
                  onClick={() => printText('רשימת קנייה — ' + project.client.name,
                    s.shoppingList.result.categories
                      .map((cat: any) => `${cat.emoji} ${cat.supplierType}\n` +
                        cat.items.map((it: any) => `  • ${it.name}: ${it.quantity} ${it.unit}${it.notes ? ` (${it.notes})` : ''}`).join('\n'))
                      .join('\n\n'))}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Printer size={13} />
                  הדפס
                </button>
              </div>
            </div>
          )}
        </ToolSection>

        {/* ── 6. Budget Guardian ───────────────────────────────────────────── */}
        <ToolSection
          icon={<Shield size={16} />}
          title="Budget Guardian — התאמה לתקציב"
          description="הלקוח מגביל תקציב? AI יתאים את ה-scope ויסביר מה להוריד"
          state={s.budget}
          onToggle={() => toggle('budget')}
        >
          <div className="mt-2 mb-3">
            <label className="text-xs text-gray-500 block mb-1">תקציב מקסימלי של הלקוח (כולל מע"מ):</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="לדוגמה: 120000"
                className="input text-sm flex-1"
              />
              <button
                onClick={handleBudget}
                disabled={s.budget.loading || !budgetInput}
                className="btn btn-primary btn-sm whitespace-nowrap"
              >
                {s.budget.loading ? <Loader size={14} className="animate-spin" /> : <Shield size={14} />}
                {s.budget.loading ? 'מחשב...' : 'הגן על תקציב'}
              </button>
            </div>
          </div>
          {s.budget.error && <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 rounded-xl p-3"><AlertCircle size={13} />{s.budget.error}</div>}
          {s.budget.result?.keptItems && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-bold text-green-700 bg-green-50 rounded-xl p-3">
                <span>סה"כ מותאם לתקציב</span>
                <span>₪{s.budget.result.adjustedTotal.toLocaleString('he-IL')}</span>
              </div>
              {s.budget.result.keptItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">✅ נשמר בפרויקט:</p>
                  {s.budget.result.keptItems.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm text-slate-700 py-1 border-b border-gray-50">
                      <span className="flex items-center gap-1">
                        <span className={it.priority === 'must' ? 'text-red-500' : it.priority === 'should' ? 'text-amber-500' : 'text-green-500'}>●</span>
                        {it.name}
                      </span>
                      <span>₪{it.total.toLocaleString('he-IL')}</span>
                    </div>
                  ))}
                </div>
              )}
              {s.budget.result.removedItems?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">❌ הוסר לחיסכון:</p>
                  {s.budget.result.removedItems.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm text-gray-400 py-1 line-through">
                      <span>{it.name} — {it.reason}</span>
                      <span>₪{it.total.toLocaleString('he-IL')}</span>
                    </div>
                  ))}
                </div>
              )}
              {s.budget.result.suggestions?.map((s: string, i: number) => (
                <p key={i} className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">💡 {s}</p>
              ))}
              {s.budget.result.warning && (
                <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">⚠️ {s.budget.result.warning}</p>
              )}
            </div>
          )}
        </ToolSection>

        {/* ── 7. Risk Score ─────────────────────────────────────────────────── */}
        <ToolSection
          icon={<TrendingUp size={16} />}
          title="ציון סיכון לפרויקט"
          description="AI מעריך את רמת הסיכון לפני שמתחילים — מורכבות, היקף, לקוח"
          state={s.risk}
          onToggle={() => toggle('risk')}
        >
          <button
            onClick={handleRisk}
            disabled={s.risk.loading}
            className="btn btn-primary btn-sm mt-2 mb-3"
          >
            {s.risk.loading ? <Loader size={14} className="animate-spin" /> : <TrendingUp size={14} />}
            {s.risk.loading ? 'מחשב סיכון...' : 'הערך סיכון'}
          </button>
          {s.risk.error && <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 rounded-xl p-3"><AlertCircle size={13} />{s.risk.error}</div>}
          {s.risk.result?.score !== undefined && (
            <div className="space-y-3">
              <div className={`rounded-xl p-3 text-center ${
                s.risk.result.level === 'low' ? 'bg-green-50' :
                s.risk.result.level === 'medium' ? 'bg-amber-50' :
                s.risk.result.level === 'high' ? 'bg-orange-50' : 'bg-red-50'
              }`}>
                <div className={`text-3xl font-black ${
                  s.risk.result.level === 'low' ? 'text-green-600' :
                  s.risk.result.level === 'medium' ? 'text-amber-600' :
                  s.risk.result.level === 'high' ? 'text-orange-600' : 'text-red-600'
                }`}>{s.risk.result.score}/100</div>
                <div className="text-sm font-bold text-slate-700">{
                  s.risk.result.level === 'low' ? '✅ סיכון נמוך' :
                  s.risk.result.level === 'medium' ? '⚠️ סיכון בינוני' :
                  s.risk.result.level === 'high' ? '🔶 סיכון גבוה' : '🔴 סיכון קריטי'
                }</div>
                <p className="text-xs text-gray-600 mt-1">{s.risk.result.summary}</p>
              </div>
              {s.risk.result.factors?.map((f: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-base">{f.emoji}</span>
                  <div>
                    <span className={`font-semibold ${f.impact === 'positive' ? 'text-green-700' : f.impact === 'negative' ? 'text-red-600' : 'text-gray-600'}`}>{f.name}</span>
                    <span className="text-gray-500 mr-1">— {f.description}</span>
                  </div>
                </div>
              ))}
              {s.risk.result.recommendations?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">המלצות:</p>
                  {s.risk.result.recommendations.map((r: string, i: number) => (
                    <p key={i} className="text-xs text-slate-700 bg-gray-50 rounded-lg p-2 mb-1">• {r}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </ToolSection>

        {/* ── 8. Payment Reminders ──────────────────────────────────────────── */}
        <ToolSection
          icon={<Bell size={16} />}
          title="תזכורות תשלום חכמות"
          description="3 גרסאות של הודעת גביית חוב — רכה, נחרצת, ורשמית"
          state={s.reminder}
          onToggle={() => toggle('reminder')}
        >
          <div className="mt-2 mb-3">
            <label className="text-xs text-gray-500 block mb-1">ימים מאז מועד התשלום:</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                min="1"
                className="input text-sm w-24"
              />
              <button
                onClick={handleReminder}
                disabled={s.reminder.loading}
                className="btn btn-primary btn-sm"
              >
                {s.reminder.loading ? <Loader size={14} className="animate-spin" /> : <Bell size={14} />}
                {s.reminder.loading ? 'מייצר...' : 'צור הודעות'}
              </button>
            </div>
          </div>
          {s.reminder.error && <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 rounded-xl p-3"><AlertCircle size={13} />{s.reminder.error}</div>}
          {s.reminder.result?.gentle && (
            <div className="space-y-3">
              {[
                { key: 'gentle', label: '😊 רכה ומכובדת', bg: 'bg-green-50', border: 'border-green-100' },
                { key: 'firm', label: '💼 נחרצת ועסקית', bg: 'bg-amber-50', border: 'border-amber-100' },
                { key: 'formal', label: '⚖️ רשמית לפני צעדים', bg: 'bg-red-50', border: 'border-red-100' },
              ].map(({ key, label, bg, border }) => (
                <div key={key} className={`${bg} rounded-xl p-3 border ${border}`}>
                  <p className="text-xs font-bold text-gray-600 mb-2">{label}</p>
                  <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed mb-2">
                    {s.reminder.result[key]}
                  </p>
                  <div className="flex gap-2">
                    <CopyBtn text={s.reminder.result[key]} />
                    {project.client.phone && (
                      <button
                        onClick={() => openWhatsAppText(project.client.phone, s.reminder.result[key])}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                      >
                        <MessageCircle size={13} />
                        WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ToolSection>

        {/* ── 9. Competitive Intel ──────────────────────────────────────────── */}
        <ToolSection
          icon={<BarChart2 size={16} />}
          title="ניתוח תחרותי — האם המחיר בשוק?"
          description="AI משווה את המחיר שלך לשוק ישראל 2025 לפי סוג נכס וגמר"
          state={s.competitive}
          onToggle={() => toggle('competitive')}
        >
          <button
            onClick={handleCompetitive}
            disabled={s.competitive.loading}
            className="btn btn-primary btn-sm mt-2 mb-3"
          >
            {s.competitive.loading ? <Loader size={14} className="animate-spin" /> : <BarChart2 size={14} />}
            {s.competitive.loading ? 'מנתח...' : 'נתח מחיר'}
          </button>
          {s.competitive.error && <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 rounded-xl p-3"><AlertCircle size={13} />{s.competitive.error}</div>}
          {s.competitive.result?.verdict && (
            <div className="space-y-3">
              <div className={`rounded-xl p-3 text-center ${
                s.competitive.result.verdict === 'below' ? 'bg-red-50' :
                s.competitive.result.verdict === 'market' ? 'bg-green-50' :
                s.competitive.result.verdict === 'above' ? 'bg-amber-50' : 'bg-purple-50'
              }`}>
                <div className="text-2xl font-black text-slate-800 mb-1">
                  {s.competitive.result.percentDiff > 0 ? '+' : ''}{s.competitive.result.percentDiff}%
                  {' '}
                  <span className={`text-base ${
                    s.competitive.result.verdict === 'below' ? 'text-red-600' :
                    s.competitive.result.verdict === 'market' ? 'text-green-600' :
                    s.competitive.result.verdict === 'above' ? 'text-amber-600' : 'text-purple-600'
                  }`}>
                    {s.competitive.result.verdict === 'below' ? 'מתחת לשוק' :
                     s.competitive.result.verdict === 'market' ? 'בטווח שוק' :
                     s.competitive.result.verdict === 'above' ? 'מעל שוק' : 'פרימיום'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  המחיר שלך: ₪{s.competitive.result.yourPricePerSqm?.toLocaleString('he-IL')} למ"ר |
                  שוק: ₪{s.competitive.result.marketPricePerSqm?.toLocaleString('he-IL')} למ"ר
                </div>
              </div>
              <div className="text-sm text-slate-700 bg-gray-50 rounded-xl p-3">
                <p className="font-semibold text-xs text-gray-500 mb-1">טווח שוק (לפני מע"מ):</p>
                ₪{s.competitive.result.marketRangeLow?.toLocaleString('he-IL')} — ₪{s.competitive.result.marketRangeHigh?.toLocaleString('he-IL')}
              </div>
              <p className="text-sm text-slate-700">{s.competitive.result.analysis}</p>
              {s.competitive.result.suggestions?.map((sg: string, i: number) => (
                <p key={i} className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">💡 {sg}</p>
              ))}
            </div>
          )}
        </ToolSection>

        {/* ── 5. Contract ───────────────────────────────────────────────────── */}
        <ToolSection
          toolKey="contract"
          icon={<FileText size={16} />}
          title="טיוטת חוזה"
          description="חוזה עבודה בעברית מהנתונים הקיימים — לסקירה עם עורך דין"
          state={s.contract}
          onToggle={() => toggle('contract')}
        >
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-2.5 mt-2 mb-3">
            ⚠️ הטיוטה מיועדת לשימוש כבסיס בלבד. יש לסקור עם עורך דין לפני חתימה.
          </div>
          <button
            onClick={handleContract}
            disabled={s.contract.loading}
            className="btn btn-primary btn-sm mb-3"
          >
            {s.contract.loading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {s.contract.loading ? 'מייצר חוזה...' : 'צור טיוטת חוזה'}
          </button>

          {s.contract.error && (
            <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 rounded-xl p-3">
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              {s.contract.error}
            </div>
          )}

          {s.contract.result?.contractText && (
            <div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 max-h-80 overflow-y-auto text-sm text-slate-700 whitespace-pre-line leading-relaxed mb-2">
                {s.contract.result.contractText}
              </div>
              <div className="flex gap-2">
                <CopyBtn text={s.contract.result.contractText} />
                <button
                  onClick={() => printText('חוזה עבודה — ' + project.client.name, s.contract.result.contractText)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Printer size={13} />
                  הדפס / PDF
                </button>
              </div>
            </div>
          )}
        </ToolSection>

      </div>
    </div>
  );
}
