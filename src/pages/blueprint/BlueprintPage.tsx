import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MonitorSmartphone, Upload, Trash2, PlusCircle, Link2, ArrowUpRight,
  AlertTriangle, CheckCircle2, FileText, Sparkles, Loader,
} from 'lucide-react';
import { useBlueprintStore } from '../../stores/blueprintStore';
import { useProjectStore } from '../../stores/projectStore';
import { useSettingsStore } from '../../stores/settingsStore';
import BlueprintUploadZone from '../../components/blueprint/BlueprintUploadZone';
import BlueprintToolbar from '../../components/blueprint/BlueprintToolbar';
import BlueprintCanvas, { type BlueprintCanvasHandle } from '../../components/blueprint/BlueprintCanvas';
import BlueprintBOQPanel from '../../components/blueprint/BlueprintBOQPanel';
import CreateProjectFromBlueprintModal from '../../components/blueprint/CreateProjectFromBlueprintModal';
import LinkProjectModal from '../../components/blueprint/LinkProjectModal';
import PushToEstimateModal from '../../components/blueprint/PushToEstimateModal';
import BlueprintAiReview from '../../features/blueprint-ai/BlueprintAiReview';
import {
  analyzeBlueprint,
  aiAnalysisToEstimationBrief,
} from '../../features/blueprint-ai/blueprintAiService';
import type {
  AiAnalysisState,
  AiBlueprintAnalysis,
} from '../../features/blueprint-ai/blueprintAiTypes';
import { generateBOQFromBrief, boqItemsToSelectedItems } from '../../lib/boqGenerator';
import { calculateAutoAssumptions } from '../../lib/pricingEngine';
import type { BpFile } from '../../types/blueprint';
import type { Property } from '../../types';

export default function BlueprintPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<BlueprintCanvasHandle>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const {
    activeTool, calibration, showBOQ, rooms, annotations, linkedProjectId,
    setActiveTool, toggleBOQ, clearAll,
  } = useBlueprintStore();

  const { getProject, createProject } = useProjectStore();
  const { pricing } = useSettingsStore();
  const linkedProject = linkedProjectId ? getProject(linkedProjectId) : undefined;

  const [file, setFile] = useState<BpFile | null>(null);
  const [displayScale, setDisplayScale] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'room' | 'annotation' | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);

  // ── AI analysis state ─────────────────────────────────────────────────────

  const [analysisState, setAnalysisState] = useState<AiAnalysisState>({
    status: 'idle',
    analysis: null,
    error: null,
    isMock: false,
  });
  const [showReview, setShowReview] = useState(false);

  async function handleAnalyze() {
    if (!file) return;
    setAnalysisState({ status: 'analyzing', analysis: null, error: null, isMock: false });
    try {
      const { analysis, isMock, blueprintId } = await analyzeBlueprint(file.dataUrl, file.name);
      setAnalysisState({ status: 'review', analysis, blueprintId, error: null, isMock });
      setShowReview(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה לא ידועה בניתוח התוכנית';
      setAnalysisState({ status: 'error', analysis: null, error: msg, isMock: false });
    }
  }

  function handleBackFromReview() {
    setShowReview(false);
  }

  async function handleApproveAnalysis(
    approvedAnalysis: AiBlueprintAnalysis,
    client: { name: string; phone: string; address: string; city: string },
  ) {
    const brief = aiAnalysisToEstimationBrief(approvedAnalysis);
    const property: Property = {
      type: 'apartment',
      totalSqm: brief.totalSqm,
      rooms: brief.rooms,
      bathrooms: brief.bathrooms,
      toilets: brief.toilets,
      kitchens: brief.kitchens,
      balconies: brief.balconies,
      ceilingHeight: 2.7,
      hasElevator: false,
      hasParking: false,
      condition: brief.condition,
      finishLevel: brief.finishLevel,
    };
    const { items } = generateBOQFromBrief(brief, pricing);
    const selectedItems = boqItemsToSelectedItems(items);
    const autoOverrides = calculateAutoAssumptions(property);
    const project = createProject(
      { name: client.name, phone: client.phone, address: client.address, city: client.city },
      property,
      selectedItems,
      autoOverrides,
      'נוצר מניתוח תוכנית AI',
    );
    navigate(`/project/${project.id}/boq`);
  }

  function handleNewFile(f: BpFile) {
    setFile(f);
    clearAll();
  }

  function handleDeleteSelected() {
    const { deleteRoom, deleteAnnotation } = useBlueprintStore.getState();
    if (!selectedId || !selectedType) return;
    if (selectedType === 'room') deleteRoom(selectedId);
    else deleteAnnotation(selectedId);
    setSelectedId(null);
    setSelectedType(null);
  }

  function handleFullscreen() {
    if (!document.fullscreenElement) {
      workspaceRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  function handleClearAll() {
    if (window.confirm('מחיקת כל הסימונים, החדרים וכיול קנה המידה?')) {
      clearAll();
    }
  }

  // ─── Validation warnings ──────────────────────────────────────────────────────

  const hasScale = !!calibration.pixelsPerMeter;
  const hasRooms = rooms.length > 0;
  const hasAnnotations = annotations.length > 0;
  const hasLinkedProject = !!linkedProjectId;

  const validationWarnings: string[] = [];
  if (file && !hasScale) validationWarnings.push('יש לכייל קנה מידה כדי לחשב מטרים וכמויות');
  if (file && !hasRooms) validationWarnings.push('לא סומנו חדרים בתוכנית');
  if (file && !hasAnnotations) validationWarnings.push('לא סומנו עבודות בתוכנית');

  // ─── No file: upload zone ─────────────────────────────────────────────────────

  if (!file) {
    return (
      <div className="page-container">
        {/* Value messaging */}
        <h1 className="page-title mb-1">העלה תוכנית מקור וקבל כתב כמויות</h1>
        <p className="page-subtitle mb-1">
          המערכת מנתחת תוכניות מקור, מציעה כתב כמויות, והקבלן רק מאשר ומתקן.
        </p>
        <p className="text-xs text-gray-400 mb-5">כלי ציור ידני זמין לתיקונים לאחר הניתוח האוטומטי.</p>

        <div className="md:hidden flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
          <MonitorSmartphone size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 leading-snug">מומלץ לעבוד עם תוכניות בנייה במסך מחשב לחוויה מיטבית</p>
        </div>

        <BlueprintUploadZone onFile={handleNewFile} />

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { color: 'bg-amber-100 text-amber-700',   title: '1. העלה תוכנית',        desc: 'PNG, JPG, PDF' },
            { color: 'bg-purple-100 text-purple-700', title: '2. נתח אוטומטית',       desc: 'לחץ "נתח תוכנית" → המערכת קוראת את התוכנית' },
            { color: 'bg-blue-100 text-blue-700',     title: '3. אשר ותקן',           desc: 'בדוק חדרים וכמויות — ערוך לפי הצורך' },
            { color: 'bg-green-100 text-green-700',   title: '4. הפק הצעת מחיר',      desc: 'כתב כמויות → הצעה → לקוח' },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl p-3 ${s.color.split(' ')[0]} border border-current/20`}>
              <p className={`font-bold text-sm ${s.color.split(' ')[1]}`}>{s.title}</p>
              <p className={`text-xs mt-0.5 opacity-75 ${s.color.split(' ')[1]}`}>{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Persistent notice about image not saving */}
        <div className="mt-4 flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-amber-500" />
          קובץ התמונה עצמו לא נשמר. הסימונים נשמרים, אך יש להעלות את התוכנית מחדש לאחר רענון הדפדפן.
        </div>
      </div>
    );
  }

  // ─── Workspace ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" dir="ltr" ref={workspaceRef}>
      {/* Mobile warning */}
      <div className="md:hidden px-3 pt-2 pb-0" dir="rtl">
        <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
          <MonitorSmartphone size={14} />
          מומלץ לעבוד עם תוכניות בנייה במסך מחשב
        </div>
      </div>

      {/* Toolbar */}
      <BlueprintToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        calibration={calibration}
        scale={displayScale}
        showBOQ={showBOQ}
        selectedId={selectedId}
        onZoomIn={() => canvasRef.current?.zoomIn()}
        onZoomOut={() => canvasRef.current?.zoomOut()}
        onFitScreen={() => canvasRef.current?.fitToScreen()}
        onResetView={() => canvasRef.current?.resetView()}
        onFullscreen={handleFullscreen}
        onToggleBOQ={toggleBOQ}
        onDeleteSelected={handleDeleteSelected}
        onClearAll={handleClearAll}
      />

      {/* ── Action bar ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 border-b border-slate-700 overflow-x-auto flex-shrink-0"
        dir="rtl"
      >
        {/* Link status */}
        {linkedProject ? (
          <div className="flex items-center gap-1.5 text-xs text-green-400 flex-shrink-0">
            <CheckCircle2 size={13} />
            <span>
              תוכנית משויכת לפרויקט:&nbsp;
              <button
                onClick={() => navigate(`/project/${linkedProject.id}`)}
                className="underline hover:text-green-300"
              >
                {linkedProject.client.name}
              </button>
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 flex-shrink-0">ללא שיוך לפרויקט</span>
        )}

        <div className="flex-1" />

        {/* Validation warnings — compact */}
        {validationWarnings.length > 0 && (
          <div className="hidden md:flex items-center gap-1 text-xs text-amber-400 flex-shrink-0">
            <AlertTriangle size={12} />
            <span>{validationWarnings[0]}</span>
          </div>
        )}

        {/* Analysis error */}
        {analysisState.status === 'error' && (
          <div className="text-xs text-red-400 flex-shrink-0">⚠ {analysisState.error}</div>
        )}

        <div className="w-px h-5 bg-slate-600 flex-shrink-0" />

        {/* ── AI Analyze button ── */}
        {analysisState.status === 'analyzing' ? (
          <div className="flex items-center gap-1.5 text-xs text-purple-300 flex-shrink-0">
            <Loader size={13} className="animate-spin" />
            <span className="hidden sm:inline">מנתח תוכנית...</span>
          </div>
        ) : analysisState.status === 'review' ? (
          <button
            onClick={() => setShowReview(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-colors flex-shrink-0"
          >
            <CheckCircle2 size={13} />
            <span>תוצאות ניתוח</span>
          </button>
        ) : (
          <button
            onClick={handleAnalyze}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-colors flex-shrink-0"
          >
            <Sparkles size={13} />
            <span className="hidden sm:inline">נתח תוכנית אוטומטית</span>
            <span className="sm:hidden">נתח</span>
          </button>
        )}

        <div className="w-px h-5 bg-slate-600 flex-shrink-0" />

        {/* Action buttons */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-colors flex-shrink-0"
        >
          <PlusCircle size={13} />
          <span className="hidden sm:inline">צור פרויקט מהתוכנית</span>
          <span className="sm:hidden">פרויקט חדש</span>
        </button>

        {!linkedProject && (
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-white hover:bg-slate-600 transition-colors flex-shrink-0"
          >
            <Link2 size={13} />
            <span className="hidden sm:inline">שייך לפרויקט קיים</span>
            <span className="sm:hidden">שייך</span>
          </button>
        )}

        <button
          onClick={() => {
            if (!hasLinkedProject) {
              setShowCreateModal(true);
            } else {
              setShowPushModal(true);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-500 transition-colors flex-shrink-0"
        >
          <ArrowUpRight size={13} />
          <span className="hidden sm:inline">העבר כמויות להצעת מחיר</span>
          <span className="sm:hidden">העבר</span>
        </button>

        {linkedProject && (
          <button
            onClick={() => navigate(`/project/${linkedProject.id}/estimate`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors flex-shrink-0"
          >
            <FileText size={13} />
            <span className="hidden sm:inline">פתח הצעת מחיר</span>
          </button>
        )}
      </div>

      {/* Workspace row */}
      <div className="flex flex-1 min-h-0 relative">
        {showReview && analysisState.analysis ? (
          /* ── AI Review screen (replaces canvas) ── */
          <BlueprintAiReview
            analysis={analysisState.analysis}
            blueprintId={analysisState.blueprintId}
            isMock={analysisState.isMock}
            onApprove={handleApproveAnalysis}
            onBack={handleBackFromReview}
          />
        ) : (
          <>
            {/* PDF placeholder — canvas cannot render PDFs; AI analysis handles it */}
            {file.fileType === 'pdf' ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-100 gap-4 p-8 text-center">
                <FileText size={64} className="text-slate-300" />
                <div>
                  <p className="font-bold text-slate-700 text-lg">{file.name}</p>
                  <p className="text-sm text-slate-500 mt-1">קובץ PDF הועלה בהצלחה</p>
                  <p className="text-xs text-slate-400 mt-2">
                    לחץ <strong>"נתח תוכנית אוטומטית"</strong> בסרגל הכלים לניתוח AI
                  </p>
                </div>
                {analysisState.status === 'analyzing' && (
                  <div className="flex items-center gap-2 text-purple-600">
                    <Loader size={18} className="animate-spin" />
                    <span className="text-sm font-medium">מנתח תוכנית PDF עם AI...</span>
                  </div>
                )}
              </div>
            ) : (
            /* Canvas */
            <BlueprintCanvas
              ref={canvasRef}
              file={file}
              onSelectChange={(id, type) => { setSelectedId(id); setSelectedType(type); }}
              onScaleChange={setDisplayScale}
            />
            )}

            {/* BOQ Panel */}
            {showBOQ && (
              <div className="w-72 flex-shrink-0 border-l border-gray-200 overflow-hidden hidden md:flex flex-col">
                <BlueprintBOQPanel
                  file={file}
                  onClose={toggleBOQ}
                  onPushToEstimate={() => {
                    if (!hasLinkedProject) setShowCreateModal(true);
                    else setShowPushModal(true);
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-t border-slate-700 text-xs"
        dir="rtl"
      >
        <div className="flex items-center gap-2 text-slate-400 min-w-0">
          <Upload size={11} className="flex-shrink-0" />
          <span className="truncate max-w-48">{file.name}</span>
          <span className="text-slate-600">{file.naturalWidth}×{file.naturalHeight}px</span>
          <span className="text-amber-500/60 hidden sm:inline">
            · קובץ תמונה לא נשמר, הסימונים נשמרים
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFile(null)}
            className="text-slate-400 hover:text-white transition-colors text-xs flex items-center gap-1"
          >
            <Upload size={11} />
            החלף קובץ
          </button>
          <button
            onClick={handleClearAll}
            className="text-red-500/70 hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <Trash2 size={11} />
            נקה סימונים
          </button>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && <CreateProjectFromBlueprintModal onClose={() => setShowCreateModal(false)} />}
      {showLinkModal && <LinkProjectModal onClose={() => setShowLinkModal(false)} onLinked={() => setShowPushModal(false)} />}
      {showPushModal && <PushToEstimateModal onClose={() => setShowPushModal(false)} />}
    </div>
  );
}
