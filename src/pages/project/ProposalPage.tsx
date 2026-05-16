import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Download, MessageCircle, Share2, Loader, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { buildWhatsAppShortMessage } from '../../lib/whatsapp';
import { generateProposalPdf, downloadFile, canShareFiles } from '../../lib/proposalPdf';
import { ProposalDocument } from '../../components/proposal/ProposalDocument';
import { Button } from '../../components/ui';

type PdfStatus = 'idle' | 'generating' | 'success' | 'error';

function israeliPhoneToIntl(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('972')) return cleaned;
  if (cleaned.startsWith('0')) return '972' + cleaned.slice(1);
  return '972' + cleaned;
}

function openWhatsAppUrl(phone: string, message: string): void {
  const encoded = encodeURIComponent(message);
  const intl = phone ? israeliPhoneToIntl(phone) : '';
  const url = intl
    ? `https://wa.me/${intl}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ── Desktop instructions modal ─────────────────────────────────────────────
interface WhatsAppModalProps { onClose: () => void }
function WhatsAppModal({ onClose }: WhatsAppModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" dir="rtl" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold text-slate-900 text-lg">שליחה ללקוח בוואטסאפ</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
          וואטסאפ אינו מאפשר צירוף קובץ אוטומטי מהדפדפן. בצע את השלבים הבאים:
        </p>
        <ol className="space-y-4 mb-6">
          {[
            { n: 1, text: 'קובץ ה-PDF ירד למחשב שלך' },
            { n: 2, text: 'וואטסאפ ייפתח עם הודעה מוכנה' },
            { n: 3, text: 'צרף את קובץ ה-PDF לשיחה ושלח' },
          ].map(({ n, text }) => (
            <li key={n} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">{n}</div>
              <span className="text-sm text-slate-700">{text}</span>
            </li>
          ))}
        </ol>
        <Button variant="primary" className="w-full" onClick={onClose}>
          <CheckCircle size={16} />
          הבנתי
        </Button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ProposalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, getCurrentVersion } = useProjectStore();
  const { company } = useSettingsStore();

  const docRef = useRef<HTMLDivElement>(null);
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>('idle');
  const [showModal, setShowModal] = useState(false);

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

  const proposalNumber = `${String(version.versionNumber).padStart(3, '0')}-${project.id.slice(0, 6).toUpperCase()}`;
  const pdfFilename = `proposal-${project.client.name.replace(/\s+/g, '-')}-${proposalNumber}.pdf`;

  async function buildPdf(): Promise<{ file: File | null; error: boolean }> {
    if (!docRef.current) return { file: null, error: true };
    setPdfStatus('generating');
    try {
      const file = await generateProposalPdf(docRef.current, pdfFilename);
      return { file, error: false };
    } catch {
      setPdfStatus('error');
      setTimeout(() => setPdfStatus('idle'), 5000);
      return { file: null, error: true };
    }
  }

  function onSuccess() {
    setPdfStatus('success');
    setTimeout(() => setPdfStatus('idle'), 3000);
  }

  async function handleDownloadPdf() {
    const { file, error } = await buildPdf();
    if (error && !file) { window.print(); return; }
    if (file) { downloadFile(file); onSuccess(); }
  }

  async function handleSharePdf() {
    const { file, error } = await buildPdf();
    if (error && !file) { window.print(); return; }
    if (!file) return;
    if (canShareFiles()) {
      try {
        await navigator.share({ files: [file], title: pdfFilename });
        onSuccess();
        return;
      } catch { /* cancelled */ }
    }
    downloadFile(file);
    onSuccess();
  }

  async function handleSendClient() {
    const { file } = await buildPdf();
    const p = project!;
    const message = buildWhatsAppShortMessage(p, company);

    if (file && canShareFiles()) {
      try {
        await navigator.share({ files: [file], text: message });
        onSuccess();
        return;
      } catch { /* cancelled */ }
    }

    if (file) downloadFile(file);
    openWhatsAppUrl(p.client.phone ?? '', message);
    onSuccess();
    setShowModal(true);
  }

  const generating = pdfStatus === 'generating';

  return (
    <>
      {showModal && <WhatsAppModal onClose={() => setShowModal(false)} />}

      {/* ── Action bar (no-print) ────────────────────────────────────────── */}
      <div className="no-print sticky top-0 z-30 bg-slate-900 border-b border-slate-700 px-4 py-2.5 flex items-center gap-2" dir="rtl">
        <button
          onClick={() => navigate(`/project/${id}/estimate`)}
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-white font-bold text-sm flex-1">הצעת מחיר ללקוח</span>

        {/* Status feedback */}
        {pdfStatus === 'success' && (
          <span className="text-green-400 text-xs flex items-center gap-1">
            <CheckCircle size={13} /> קובץ PDF נוצר בהצלחה
          </span>
        )}
        {pdfStatus === 'error' && (
          <span className="text-red-400 text-xs flex items-center gap-1">
            <AlertCircle size={13} /> יצירת ה-PDF נכשלה. נסה שוב.
          </span>
        )}
        {pdfStatus === 'generating' && (
          <span className="text-white/50 text-xs flex items-center gap-1">
            <Loader size={13} className="animate-spin" /> מייצר PDF...
          </span>
        )}

        <Button variant="whatsapp" size="sm" onClick={handleSendClient} disabled={generating}>
          {generating ? <Loader size={15} className="animate-spin" /> : <MessageCircle size={15} />}
          <span className="hidden sm:inline">שלח ללקוח</span>
        </Button>

        <Button variant="outline" size="sm" onClick={handleSharePdf} disabled={generating}
          className="text-white border-white/30 hover:bg-white/10">
          {generating ? <Loader size={15} className="animate-spin" /> : <Share2 size={15} />}
          <span className="hidden sm:inline">שתף PDF</span>
        </Button>

        <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={generating}
          className="text-white border-white/30 hover:bg-white/10">
          {generating ? <Loader size={15} className="animate-spin" /> : <Download size={15} />}
          <span className="hidden sm:inline">הורד PDF</span>
        </Button>

        <Button variant="ghost" size="sm" onClick={() => window.print()} className="text-white/60 hover:text-white">
          <Printer size={15} />
        </Button>
      </div>

      {/* ── Proposal document ─────────────────────────────────────────────── */}
      <div ref={docRef}>
        <ProposalDocument
          project={project}
          version={version}
          company={company}
          proposalNumber={proposalNumber}
        />
      </div>
    </>
  );
}
