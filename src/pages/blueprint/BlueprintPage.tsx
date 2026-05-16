import { useRef, useState } from 'react';
import { MonitorSmartphone, Upload, Trash2 } from 'lucide-react';
import { useBlueprintStore } from '../../stores/blueprintStore';
import BlueprintUploadZone from '../../components/blueprint/BlueprintUploadZone';
import BlueprintToolbar from '../../components/blueprint/BlueprintToolbar';
import BlueprintCanvas, { type BlueprintCanvasHandle } from '../../components/blueprint/BlueprintCanvas';
import BlueprintBOQPanel from '../../components/blueprint/BlueprintBOQPanel';
import type { BpFile } from '../../types/blueprint';

export default function BlueprintPage() {
  const canvasRef = useRef<BlueprintCanvasHandle>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const {
    activeTool, calibration, showBOQ,
    setActiveTool, toggleBOQ, clearAll,
  } = useBlueprintStore();

  const [file, setFile] = useState<BpFile | null>(null);
  const [displayScale, setDisplayScale] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'room' | 'annotation' | null>(null);

  function handleNewFile(f: BpFile) {
    if (f.fileType === 'pdf') {
      alert('PDF תמיכה: אנא המר ל-PNG/JPG לעבודה עם כלי הסימון. ניתן להשתמש בכלי המרה חינמי כמו pdf2pic.');
      return;
    }
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

  // ─── Mobile warning ──────────────────────────────────────────────────────────

  const MobileWarning = (
    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4 md:hidden">
      <MonitorSmartphone size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800 leading-snug">
        מומלץ לעבוד עם תוכניות בנייה במסך מחשב לחוויה מיטבית
      </p>
    </div>
  );

  // ─── No file: upload zone ─────────────────────────────────────────────────────

  if (!file) {
    return (
      <div className="page-container">
        <h1 className="page-title mb-1">תוכניות בנייה</h1>
        <p className="page-subtitle">העלה תוכנית, כייל קנה מידה, סמן חדרים ואלמנטים</p>
        {MobileWarning}
        <BlueprintUploadZone onFile={handleNewFile} />
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { color: 'bg-amber-100 text-amber-700', title: '1. העלה תוכנית', desc: 'PNG, JPG' },
            { color: 'bg-blue-100 text-blue-700',   title: '2. כייל קנה מידה', desc: 'לחץ 2 נקודות → הזן מרחק' },
            { color: 'bg-green-100 text-green-700',  title: '3. סמן חדרים', desc: 'מלבן או פולגון חופשי' },
            { color: 'bg-purple-100 text-purple-700',title: '4. כתב כמויות', desc: 'נוצר אוטומטית' },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl p-3 ${s.color.split(' ')[0]} border border-current/20`}>
              <p className={`font-bold text-sm ${s.color.split(' ')[1]}`}>{s.title}</p>
              <p className={`text-xs mt-0.5 opacity-75 ${s.color.split(' ')[1]}`}>{s.desc}</p>
            </div>
          ))}
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

      {/* Workspace row */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Canvas */}
        <BlueprintCanvas
          ref={canvasRef}
          file={file}
          onSelectChange={(id, type) => { setSelectedId(id); setSelectedType(type); }}
          onScaleChange={setDisplayScale}
        />

        {/* BOQ Panel */}
        {showBOQ && (
          <div className="w-72 flex-shrink-0 border-l border-gray-200 overflow-hidden hidden md:flex flex-col">
            <BlueprintBOQPanel file={file} onClose={toggleBOQ} />
          </div>
        )}
      </div>

      {/* Footer bar (file info + change/clear) */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-t border-slate-700 text-xs"
        dir="rtl"
      >
        <div className="flex items-center gap-2 text-slate-400 min-w-0">
          <Upload size={11} className="flex-shrink-0" />
          <span className="truncate max-w-48">{file.name}</span>
          <span className="text-slate-600">
            {file.naturalWidth}×{file.naturalHeight}px
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
    </div>
  );
}
