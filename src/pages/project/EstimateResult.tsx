import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, AlertTriangle, Download, Printer } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatCurrency, formatDate, UNIT_LABELS, CONDITION_LABELS, FINISH_LABELS, generatePhotoWarning } from '../../lib/format';
import { generateHighValueWarning, generateExpiryWarning } from '../../lib/pricingEngine';
import { openWhatsApp } from '../../lib/whatsapp';
import { Button, Card, CardHeader, Alert, Badge } from '../../components/ui';
import { WORK_CATEGORIES, findWorkItem } from '../../data/workCategories';

interface BreakdownRow {
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
  negative?: boolean;
  separator?: boolean;
}

export default function EstimateResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, getCurrentVersion } = useProjectStore();
  const { company } = useSettingsStore();

  const project = id ? getProject(id) : undefined;
  const version = id ? getCurrentVersion(id) : undefined;

  if (!project || !version) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h3 className="text-xl font-bold">פרויקט לא נמצא</h3>
          <Button onClick={() => navigate('/projects')}>חזרה לרשימה</Button>
        </div>
      </div>
    );
  }

  const r = version.result;

  // Collect all warnings
  const allWarnings = [
    ...r.warnings,
    generateHighValueWarning(r.total),
    generateExpiryWarning(project.expiresAt),
    generatePhotoWarning(project.photoRefs),
  ].filter(Boolean) as string[];

  // Breakdown table rows
  const breakdown: BreakdownRow[] = [
    { label: 'חומרים', value: r.rawMaterialsCost, sub: `${((r.rawMaterialsCost / r.rawSubtotal) * 100).toFixed(0)}% מהסכום` },
    { label: 'עבודה', value: r.rawLaborCost, sub: `${((r.rawLaborCost / r.rawSubtotal) * 100).toFixed(0)}% מהסכום` },
    { label: 'סכום בסיסי', value: r.rawSubtotal, highlight: true, separator: true },
    {
      label: `תוספת מצב נכס (×${r.difficultyMultiplier.toFixed(2)})`,
      value: r.difficultyAddition,
      sub: CONDITION_LABELS[project.property.condition],
    },
    {
      label: `תוספת רמת גמר (×${r.finishMultiplier.toFixed(2)})`,
      value: r.finishAddition,
      sub: FINISH_LABELS[project.property.finishLevel],
    },
    { label: 'אחרי מכפילים', value: r.afterMultipliers, highlight: true, separator: true },
    {
      label: `רווח קבלן (${r.profitPercent}%)`,
      value: r.profitAmount,
    },
    {
      label: `רזרבה / בלת"מ (${r.contingencyPercent}%)`,
      value: r.contingencyAmount,
    },
    { label: 'לפני מע"מ', value: r.beforeVAT, highlight: true, separator: true },
    {
      label: r.vatPercent > 0 ? `מע"מ ${r.vatPercent}%` : 'מע"מ (פטור)',
      value: r.vatAmount,
    },
  ];

  // Group selected items by category
  const categorized = WORK_CATEGORIES.map((cat) => {
    const items = version.selectedItems.filter((s) => s.categoryId === cat.id);
    return { ...cat, selectedItems: items };
  }).filter((c) => c.selectedItems.length > 0);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(`/project/${id}`)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="page-title">פירוט הצעת מחיר</h1>
          <p className="page-subtitle">
            {project.client.name} • v{version.versionNumber} • {formatDate(project.createdAt)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-5 no-print">
        <Button
          variant="whatsapp"
          size="lg"
          onClick={() => openWhatsApp(project, version, company)}
        >
          <MessageCircle size={18} />
          שלח בוואטסאפ
        </Button>
        <Button
          variant="outline"
          onClick={() => alert('יצוא PDF יהיה זמין בגרסה הבאה.')}
        >
          <Download size={16} />
          PDF
          <Badge variant="gray" className="text-xs">בקרוב</Badge>
        </Button>
        <Button
          variant="outline"
          onClick={() => alert('הדפסה תהיה זמינה בגרסה הבאה.')}
        >
          <Printer size={16} />
          הדפס
          <Badge variant="gray" className="text-xs">בקרוב</Badge>
        </Button>
      </div>

      {/* Warnings */}
      {allWarnings.length > 0 && (
        <div className="space-y-2 mb-5">
          {allWarnings.map((w, i) => (
            <Alert key={i} variant="warning" icon={<AlertTriangle size={15} />}>
              {w}
            </Alert>
          ))}
        </div>
      )}

      {/* Hero total */}
      <div
        className="rounded-2xl p-7 mb-5 text-center"
        style={{ background: 'linear-gradient(135deg, #0f1b2d 0%, #1a2d4a 100%)' }}
      >
        <div className="text-white/50 text-sm mb-1">סה"כ הצעת מחיר כולל מע"מ</div>
        <div className="text-5xl md:text-6xl font-black text-amber-400 leading-none mb-3">
          {formatCurrency(r.total)}
        </div>
        <div className="flex justify-center gap-6 flex-wrap">
          <div className="text-center">
            <div className="text-white/40 text-xs">לפני מע"מ</div>
            <div className="text-white font-bold">{formatCurrency(r.beforeVAT)}</div>
          </div>
          <div className="text-center">
            <div className="text-white/40 text-xs">מע"מ {r.vatPercent}%</div>
            <div className="text-white font-bold">{formatCurrency(r.vatAmount)}</div>
          </div>
          <div className="text-center">
            <div className="text-white/40 text-xs">ימי עבודה</div>
            <div className="text-white font-bold">{r.estimatedLaborDays} ימים</div>
          </div>
        </div>
      </div>

      {/* Transparent breakdown */}
      <Card className="mb-5">
        <CardHeader>
          <h2 className="font-bold text-slate-900">פירוט חישוב שקוף</h2>
          <span className="text-xs text-gray-400">כל שלב בחישוב</span>
        </CardHeader>
        <div>
          {breakdown.map((row, i) => (
            <div key={i}>
              {row.separator && i > 0 && <div className="h-px bg-gray-100" />}
              <div
                className={`flex justify-between items-center px-5 py-3.5 ${
                  row.highlight ? 'bg-slate-50 font-bold' : ''
                }`}
              >
                <div>
                  <div className={`text-sm ${row.highlight ? 'text-slate-900 font-bold' : 'text-gray-600'}`}>
                    {row.label}
                  </div>
                  {row.sub && (
                    <div className="text-xs text-gray-400">{row.sub}</div>
                  )}
                </div>
                <div
                  className={`text-sm font-bold ${
                    row.highlight ? 'text-slate-900 text-base' : 'text-slate-700'
                  } ${row.negative ? 'text-red-600' : ''}`}
                >
                  {row.value > 0 ? '+' : ''}{formatCurrency(row.value)}
                </div>
              </div>
            </div>
          ))}
          {/* Grand total row */}
          <div
            className="flex justify-between items-center px-5 py-4"
            style={{ background: '#0f1b2d' }}
          >
            <span className="text-white font-bold text-base">סה"כ כולל מע"מ</span>
            <span className="text-amber-400 font-black text-2xl">{formatCurrency(r.total)}</span>
          </div>
        </div>
      </Card>

      {/* Work items by category */}
      <Card className="mb-5">
        <CardHeader>
          <h2 className="font-bold text-slate-900">פירוט עבודות</h2>
          <Badge variant="gray">{version.selectedItems.length} פריטים</Badge>
        </CardHeader>
        <div className="divide-y divide-gray-100">
          {categorized.map((cat) => {
            const catTotal = cat.selectedItems.reduce(
              (sum, s) => sum + s.quantity * s.unitPrice,
              0,
            );
            return (
              <div key={cat.id}>
                <div className="flex justify-between items-center px-5 py-3 bg-gray-50">
                  <span className="font-bold text-slate-800 text-sm">{cat.name}</span>
                  <span className="font-bold text-amber-700 text-sm">
                    {formatCurrency(catTotal)}
                  </span>
                </div>
                {cat.selectedItems.map((sel) => {
                  const def = findWorkItem(sel.itemId);
                  return (
                    <div key={sel.itemId} className="flex justify-between items-center px-5 py-2.5 hover:bg-gray-50">
                      <div>
                        <div className="text-sm text-slate-700">{def?.name ?? sel.itemId}</div>
                        {sel.notes && (
                          <div className="text-xs text-gray-400">{sel.notes}</div>
                        )}
                      </div>
                      <div className="text-left text-sm">
                        <div className="text-gray-500">
                          {sel.quantity} {UNIT_LABELS[sel.unit]} × {formatCurrency(sel.unitPrice)}
                        </div>
                        <div className="font-bold text-slate-900">
                          {formatCurrency(sel.quantity * sel.unitPrice)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Summary mini cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'חומרים', value: formatCurrency(r.rawMaterialsCost) },
          { label: 'עבודה', value: formatCurrency(r.rawLaborCost) },
          { label: 'רווח קבלן', value: formatCurrency(r.profitAmount) },
          { label: 'ימי עבודה', value: `${r.estimatedLaborDays} ימים` },
        ].map((item) => (
          <div key={item.label} className="card p-4 text-center">
            <div className="text-xs text-gray-400 mb-1">{item.label}</div>
            <div className="font-extrabold text-slate-900">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
