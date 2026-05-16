import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageCircle,
  AlertTriangle,
  Download,
  Printer,
  CheckCircle,
  Clock,
  Building2,
  FileText,
  Loader,
  AlertCircle,
} from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useSettingsStore } from '../../stores/settingsStore';
import {
  formatCurrency,
  formatDate,
  UNIT_LABELS,
  CONDITION_LABELS,
  FINISH_LABELS,
  PROPERTY_TYPE_LABELS,
  generatePhotoWarning,
  isExpired,
} from '../../lib/format';
import { generateHighValueWarning, generateExpiryWarning } from '../../lib/pricingEngine';
import { openWhatsApp } from '../../lib/whatsapp';
import { Button, Card, CardHeader, Alert, Badge } from '../../components/ui';
import { WORK_CATEGORIES, findWorkItem } from '../../data/workCategories';
import { ProposalDocument } from '../../components/proposal/ProposalDocument';
import { generateProposalPdf, downloadFile } from '../../lib/proposalPdf';

type PdfStatus = 'idle' | 'generating' | 'success' | 'error';

export default function EstimateResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, getCurrentVersion } = useProjectStore();
  const { company } = useSettingsStore();
  const docRef = useRef<HTMLDivElement>(null);
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>('idle');

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
  const expired = isExpired(project.expiresAt);

  // Collect all warnings
  const allWarnings = [
    ...r.warnings,
    generateHighValueWarning(r.total),
    generateExpiryWarning(project.expiresAt),
    generatePhotoWarning(project.photoRefs),
  ].filter(Boolean) as string[];

  // Group selected items by category
  const categorized = WORK_CATEGORIES.map((cat) => {
    const items = version.selectedItems.filter((s) => s.categoryId === cat.id);
    return { ...cat, selectedItems: items };
  }).filter((c) => c.selectedItems.length > 0);

  const proposalNumber = `${String(version.versionNumber).padStart(3, '0')}-${project.id.slice(0, 6).toUpperCase()}`;
  const pdfFilename = `proposal-${project.client.name.replace(/\s+/g, '-')}-${proposalNumber}.pdf`;

  async function handleDownloadPdf() {
    if (!docRef.current) return;
    setPdfStatus('generating');
    try {
      const file = await generateProposalPdf(docRef.current, pdfFilename);
      downloadFile(file);
      setPdfStatus('success');
      setTimeout(() => setPdfStatus('idle'), 3000);
    } catch {
      setPdfStatus('error');
      setTimeout(() => setPdfStatus('idle'), 5000);
    }
  }

  const generating = pdfStatus === 'generating';

  return (
    <div className="page-container">

      {/* ── a) Contractor company header ───────────────────────────────── */}
      {company.companyName && (
        <div
          className="no-print rounded-2xl p-5 mb-5 flex flex-wrap items-start justify-between gap-4"
          style={{ background: 'linear-gradient(135deg, #0f1b2d 0%, #1a2d4a 100%)' }}
        >
          <div>
            <div className="text-white font-extrabold text-lg leading-tight">{company.companyName}</div>
            {company.contactName && (
              <div className="text-white/60 text-sm mt-0.5">{company.contactName}</div>
            )}
            {company.phone && (
              <div className="text-white/60 text-sm">{company.phone}</div>
            )}
            {company.taxId && (
              <div className="text-amber-400 text-xs mt-1">עוסק מורשה: {company.taxId}</div>
            )}
          </div>
          <div className="text-left">
            <div className="text-white/40 text-xs mb-0.5">הצעת מחיר מס׳</div>
            <div className="text-amber-400 font-black text-xl">{version.versionNumber}</div>
            <div className="text-white/50 text-xs mt-1">{formatDate(project.createdAt)}</div>
          </div>
        </div>
      )}

      {/* ── b) Client + proposal meta card ─────────────────────────────── */}
      <Card className="mb-5">
        <div className="p-5">
          <div className="flex flex-wrap gap-6 mb-4">
            {/* Left: client info */}
            <div className="flex-1 min-w-48">
              <div className="text-xs text-gray-400 font-semibold mb-1">הצעת מחיר מוגשת עבור:</div>
              <div className="font-bold text-slate-900 text-base">{project.client.name}</div>
              {(project.client.address || project.client.city) && (
                <div className="text-sm text-gray-500 mt-0.5">
                  {project.client.address}{project.client.city ? `, ${project.client.city}` : ''}
                </div>
              )}
              {project.client.phone && (
                <div className="text-sm text-gray-500">{project.client.phone}</div>
              )}
            </div>
            {/* Right: proposal meta */}
            <div className="text-right">
              <div className="text-xs text-gray-400 mb-1">תאריך הצעה:</div>
              <div className="font-semibold text-slate-800 text-sm">{formatDate(project.createdAt)}</div>
              {project.expiresAt && (
                <>
                  <div className="text-xs text-gray-400 mt-2 mb-1">תוקף עד:</div>
                  <div className={`font-semibold text-sm ${expired ? 'text-red-600' : 'text-slate-800'}`}>
                    {formatDate(project.expiresAt)}
                    {expired && ' (פג)'}
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Property summary badges */}
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-gray">
              <Building2 size={11} />
              {PROPERTY_TYPE_LABELS[project.property.type]}
            </span>
            <span className="badge badge-gray">{project.property.totalSqm} מ"ר</span>
            <span className="badge badge-gray">{project.property.rooms} חדרים</span>
            <span className="badge badge-gray">{CONDITION_LABELS[project.property.condition]}</span>
            <span className="badge badge-gray">{FINISH_LABELS[project.property.finishLevel]}</span>
          </div>
        </div>
      </Card>

      {/* ── c) Actions bar ──────────────────────────────────────────────── */}
      <div className="no-print flex flex-wrap items-center gap-2 mb-5">
        <button
          onClick={() => navigate(`/project/${id}`)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ArrowLeft size={20} />
        </button>
        <Button
          variant="whatsapp"
          size="lg"
          onClick={() => openWhatsApp(project, version, company)}
        >
          <MessageCircle size={18} />
          שלח בוואטסאפ
        </Button>
        <Button
          onClick={() => navigate(`/project/${id}/proposal`)}
        >
          <FileText size={16} />
          הצעה ללקוח
        </Button>
        <Button
          variant="outline"
          onClick={() => window.print()}
        >
          <Printer size={16} />
          הדפס
        </Button>
        <Button
          variant="outline"
          onClick={handleDownloadPdf}
          disabled={generating}
        >
          {generating ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
          {generating ? 'מייצר PDF...' : 'PDF'}
        </Button>
        {pdfStatus === 'success' && (
          <span className="text-green-600 text-xs flex items-center gap-1 self-center">
            <CheckCircle size={13} /> קובץ PDF נוצר בהצלחה
          </span>
        )}
        {pdfStatus === 'error' && (
          <span className="text-red-600 text-xs flex items-center gap-1 self-center">
            <AlertCircle size={13} /> יצירת ה-PDF נכשלה. נסה שוב.
          </span>
        )}
      </div>

      {/* ── d) Warnings ─────────────────────────────────────────────────── */}
      {allWarnings.length > 0 && (
        <div className="no-print space-y-2 mb-5">
          {allWarnings.map((w, i) => (
            <Alert key={i} variant="warning" icon={<AlertTriangle size={15} />}>
              {w}
            </Alert>
          ))}
        </div>
      )}

      {/* ── e) Hero total ────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-7 mb-5 text-center"
        style={{ background: 'linear-gradient(135deg, #0f1b2d 0%, #1a2d4a 100%)' }}
      >
        <div className="text-white/50 text-sm mb-1">סה״כ הצעת מחיר כולל מע״מ</div>
        <div className="text-5xl md:text-6xl font-black text-amber-400 leading-none mb-4">
          {formatCurrency(r.total)}
        </div>
        <div className="flex justify-center gap-6 flex-wrap">
          <div className="text-center">
            <div className="text-white/40 text-xs">לפני מע״מ</div>
            <div className="text-white font-bold">{formatCurrency(r.beforeVAT)}</div>
          </div>
          <div className="text-center">
            <div className="text-white/40 text-xs">מע״מ {r.vatPercent}%</div>
            <div className="text-white font-bold">{formatCurrency(r.vatAmount)}</div>
          </div>
          <div className="text-center">
            <div className="text-white/40 text-xs">ימי עבודה מוערכים</div>
            <div className="text-white font-bold">{r.estimatedLaborDays} ימים</div>
          </div>
        </div>
      </div>

      {/* ── f) Work items breakdown card ─────────────────────────────────── */}
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
                {/* Category header row */}
                <div
                  className="flex justify-between items-center px-5 py-3"
                  style={{ background: '#1a2d4a' }}
                >
                  <span className="font-bold text-white text-sm">{cat.name}</span>
                  <span className="font-bold text-amber-400 text-sm">
                    {formatCurrency(catTotal)}
                  </span>
                </div>
                {/* Items */}
                {cat.selectedItems.map((sel) => {
                  const def = findWorkItem(sel.itemId);
                  const lineTotal = sel.quantity * sel.unitPrice;
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
                          {formatCurrency(lineTotal)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {/* Footer row */}
          <div className="flex justify-between items-center px-5 py-3 bg-gray-50 text-sm text-gray-500">
            <span>{categorized.length} קטגוריות · {version.selectedItems.length} פריטים</span>
            <span className="font-bold text-slate-900">{formatCurrency(r.rawSubtotal)}</span>
          </div>
        </div>
      </Card>

      {/* ── g) Transparent pricing calculation card ───────────────────────── */}
      <Card className="mb-5">
        <CardHeader>
          <h2 className="font-bold text-slate-900">חישוב מחיר שקוף</h2>
          <span className="text-xs text-gray-400">כל שלב בחישוב</span>
        </CardHeader>
        <div>
          {/* חומרים */}
          <div className="flex justify-between items-center px-5 py-3.5">
            <div className="text-sm text-gray-600">
              חומרים
              <span className="text-xs text-gray-400 mr-1">
                ({r.rawSubtotal > 0 ? ((r.rawMaterialsCost / r.rawSubtotal) * 100).toFixed(0) : 0}%)
              </span>
            </div>
            <div className="text-sm font-bold text-blue-600">{formatCurrency(r.rawMaterialsCost)}</div>
          </div>
          {/* עבודה */}
          <div className="flex justify-between items-center px-5 py-3.5">
            <div className="text-sm text-gray-600">
              עבודה
              <span className="text-xs text-gray-400 mr-1">
                ({r.rawSubtotal > 0 ? ((r.rawLaborCost / r.rawSubtotal) * 100).toFixed(0) : 0}%)
              </span>
            </div>
            <div className="text-sm font-bold text-green-600">{formatCurrency(r.rawLaborCost)}</div>
          </div>
          {/* סכום בסיסי */}
          <div className="h-px bg-gray-100" />
          <div className="flex justify-between items-center px-5 py-3.5 bg-slate-50">
            <div className="text-sm font-bold text-slate-900">סכום בסיסי</div>
            <div className="text-base font-bold text-slate-900">{formatCurrency(r.rawSubtotal)}</div>
          </div>
          <div className="h-px bg-gray-100" />
          {/* מכפיל קושי */}
          <div className="flex justify-between items-center px-5 py-3.5">
            <div className="text-sm text-gray-600">
              מכפיל קושי (×{r.difficultyMultiplier.toFixed(2)})
              <span className="text-xs text-gray-400 mr-1">{CONDITION_LABELS[project.property.condition]}</span>
            </div>
            <div className={`text-sm font-bold ${r.difficultyAddition > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {r.difficultyAddition > 0 ? '+' : ''}{formatCurrency(r.difficultyAddition)}
            </div>
          </div>
          {/* מכפיל גמר */}
          <div className="flex justify-between items-center px-5 py-3.5">
            <div className="text-sm text-gray-600">
              מכפיל גמר (×{r.finishMultiplier.toFixed(2)})
              <span className="text-xs text-gray-400 mr-1">{FINISH_LABELS[project.property.finishLevel]}</span>
            </div>
            <div className={`text-sm font-bold ${r.finishAddition > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {r.finishAddition > 0 ? '+' : ''}{formatCurrency(r.finishAddition)}
            </div>
          </div>
          {/* אחרי מכפילים */}
          <div className="h-px bg-gray-100" />
          <div className="flex justify-between items-center px-5 py-3.5 bg-slate-50">
            <div className="text-sm font-bold text-slate-900">אחרי מכפילים</div>
            <div className="text-base font-bold text-slate-900">{formatCurrency(r.afterMultipliers)}</div>
          </div>
          <div className="h-px bg-gray-100" />
          {/* רווח קבלן */}
          <div className="flex justify-between items-center px-5 py-3.5">
            <div className="text-sm text-gray-600">רווח קבלן ({r.profitPercent}%)</div>
            <div className="text-sm font-bold text-green-600">+{formatCurrency(r.profitAmount)}</div>
          </div>
          {/* רזרבה */}
          <div className="flex justify-between items-center px-5 py-3.5">
            <div className="text-sm text-gray-600">רזרבה / בלת״מ ({r.contingencyPercent}%)</div>
            <div className="text-sm font-bold text-orange-600">+{formatCurrency(r.contingencyAmount)}</div>
          </div>
          {/* לפני מע"מ */}
          <div className="h-px bg-gray-100" />
          <div className="flex justify-between items-center px-5 py-3.5 bg-slate-50">
            <div className="text-sm font-bold text-slate-900">לפני מע״מ</div>
            <div className="text-base font-bold text-slate-900">{formatCurrency(r.beforeVAT)}</div>
          </div>
          <div className="h-px bg-gray-100" />
          {/* מע"מ */}
          <div className="flex justify-between items-center px-5 py-3.5">
            <div className="text-sm text-gray-600">
              {r.vatPercent > 0 ? `מע״מ ${r.vatPercent}%` : 'מע״מ (פטור)'}
            </div>
            <div className="text-sm font-bold text-slate-600">{formatCurrency(r.vatAmount)}</div>
          </div>
          {/* Grand total */}
          <div
            className="flex justify-between items-center px-5 py-4"
            style={{ background: '#0f1b2d' }}
          >
            <span className="text-white font-bold text-base">סה״כ כולל מע״מ</span>
            <span className="text-amber-400 font-black text-2xl">{formatCurrency(r.total)}</span>
          </div>
        </div>
      </Card>

      {/* ── h) Payment milestones card ───────────────────────────────────── */}
      {company.paymentTerms && company.paymentTerms.length > 0 && (
        <Card className="mb-5">
          <CardHeader>
            <h2 className="font-bold text-slate-900">תנאי תשלום</h2>
          </CardHeader>
          <div className="divide-y divide-gray-100">
            {company.paymentTerms.map((term, i) => {
              const match = term.match(/(\d+)%/);
              const pct = match ? parseInt(match[1], 10) : null;
              const amount = pct !== null ? (r.total * pct) / 100 : null;
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  <div className="flex-1 text-sm text-slate-700">{term}</div>
                  {amount !== null && (
                    <div className="font-bold text-slate-900 text-sm">{formatCurrency(amount)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── i) Summary mini-cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-20 lg:mb-5">
        {[
          { label: 'חומרים', value: formatCurrency(r.rawMaterialsCost), icon: <Building2 size={16} className="text-blue-500" /> },
          { label: 'עבודה', value: formatCurrency(r.rawLaborCost), icon: <Clock size={16} className="text-green-500" /> },
          { label: 'רווח קבלן', value: formatCurrency(r.profitAmount), icon: <CheckCircle size={16} className="text-amber-500" /> },
          { label: 'ימי עבודה', value: `${r.estimatedLaborDays} ימים`, icon: <Clock size={16} className="text-purple-500" /> },
        ].map((item) => (
          <div key={item.label} className="card p-4 text-center">
            <div className="flex justify-center mb-1">{item.icon}</div>
            <div className="text-xs text-gray-400 mb-1">{item.label}</div>
            <div className="font-extrabold text-slate-900">{item.value}</div>
          </div>
        ))}
      </div>

      {/* ── j) Mobile sticky bottom bar ─────────────────────────────────── */}
      <div className="no-print lg:hidden fixed bottom-16 left-0 right-0 z-20 px-3 pb-2">
        <div
          className="card flex items-center justify-between px-4 py-3"
          style={{ background: 'linear-gradient(135deg, #0f1b2d 0%, #1a2d4a 100%)', border: 'none' }}
        >
          <div>
            <div className="text-white/50 text-xs">סה״כ כולל מע״מ</div>
            <div className="text-amber-400 font-black text-lg leading-tight">{formatCurrency(r.total)}</div>
          </div>
          <Button
            variant="whatsapp"
            size="sm"
            onClick={() => openWhatsApp(project, version, company)}
          >
            <MessageCircle size={16} />
            ואטסאפ
          </Button>
        </div>
      </div>

      {/* Hidden off-screen proposal document used by html2canvas for PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px', background: '#fff', pointerEvents: 'none' }} aria-hidden="true">
        <div ref={docRef}>
          <ProposalDocument
            project={project}
            version={version}
            company={company}
            proposalNumber={proposalNumber}
          />
        </div>
      </div>
    </div>
  );
}
