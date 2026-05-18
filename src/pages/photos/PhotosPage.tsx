import { useState, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  Cpu,
  AlertCircle,
  Loader,
  RefreshCw,
  Star,
  Wrench,
  Package,
} from 'lucide-react';

interface PhotoFinding {
  category: string;
  emoji: string;
  severity: 'good' | 'fair' | 'poor' | 'critical';
  description: string;
}

interface PhotoWorkItem {
  item: string;
  urgency: 'must' | 'should' | 'nice';
  estimatedCost?: string;
}

interface PhotoAnalysisResult {
  conditionScore: number;
  summary: string;
  roomType: string;
  findings: PhotoFinding[];
  recommendedWork: PhotoWorkItem[];
  materialsIdentified: string[];
}

const SEVERITY_CONFIG = {
  good: { label: 'תקין', color: '#4ade80', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' },
  fair: { label: 'סביר', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)' },
  poor: { label: 'דרוש טיפול', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)' },
  critical: { label: 'דחוף', color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' },
};

const URGENCY_CONFIG = {
  must: { label: 'הכרחי', color: '#f87171', icon: '🔴' },
  should: { label: 'מומלץ', color: '#fbbf24', icon: '🟡' },
  nice: { label: 'אופציונלי', color: '#4ade80', icon: '🟢' },
};

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#fbbf24' : score >= 40 ? '#f97316' : '#f87171';
  const label = score >= 80 ? 'מצב טוב' : score >= 60 ? 'מצב סביר' : score >= 40 ? 'דרוש שיפוץ' : 'דחוף';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="absolute" width="128" height="128" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease-out', filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="text-center">
          <div className="text-3xl font-black" style={{ color }}>{score}</div>
          <div className="text-xs" style={{ color: 'rgba(232,238,248,0.4)' }}>/100</div>
        </div>
      </div>
      <span
        className="text-sm font-bold px-3 py-1 rounded-full"
        style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
      >
        {label}
      </span>
    </div>
  );
}

export default function PhotosPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<PhotoAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('יש להעלות קובץ תמונה (JPG, PNG, WEBP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('התמונה גדולה מדי — מקסימום 10MB');
      return;
    }
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      const base64 = dataUrl.split(',')[1];
      setImageBase64(base64);
      setImageMime(file.type);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  async function handleAnalyze() {
    if (!imageBase64) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/photos/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image: imageBase64, mimeType: imageMime }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'שגיאה בניתוח');
      }
      const data = await res.json() as PhotoAnalysisResult;
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  function handleReset() {
    setImagePreview(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title mb-1">ניתוח תמונות נכס</h1>
          <p className="page-subtitle">העלה תמונה — ה-AI יזהה את מצב הנכס, חומרים וממצאים</p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{ background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.2)', color: '#f0c040' }}
        >
          <Cpu size={13} />
          Claude Vision AI
        </div>
      </div>

      {/* Upload zone */}
      {!imagePreview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-3xl p-12 flex flex-col items-center gap-5 text-center transition-all duration-200 mb-5"
          style={{
            border: `2px dashed ${dragging ? 'rgba(212,160,23,0.6)' : 'rgba(255,255,255,0.12)'}`,
            background: dragging
              ? 'rgba(212,160,23,0.05)'
              : 'rgba(255,255,255,0.02)',
          }}
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(212,160,23,0.18) 0%, rgba(212,160,23,0.06) 100%)',
              border: '1px solid rgba(212,160,23,0.2)',
              boxShadow: '0 0 24px rgba(212,160,23,0.12)',
            }}
          >
            <Camera size={36} style={{ color: '#d4a017' }} />
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: '#f0f4ff' }}>
              גרור תמונה לכאן
            </p>
            <p className="text-sm mt-1" style={{ color: 'rgba(232,238,248,0.4)' }}>
              או לחץ לבחירה מהגלריה • JPG, PNG, WEBP עד 10MB
            </p>
          </div>
          <button
            className="btn btn-primary btn-md"
            onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
          >
            <Upload size={16} />
            בחר תמונה
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
          />
        </div>
      ) : (
        <div className="mb-5">
          {/* Image preview + action */}
          <div
            className="rounded-3xl overflow-hidden mb-4 relative"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <img
              src={imagePreview}
              alt="תמונת נכס"
              className="w-full max-h-72 object-cover"
            />
            <div
              className="absolute inset-0 flex items-end p-4"
              style={{ background: 'linear-gradient(to top, rgba(2,8,16,0.7) 0%, transparent 50%)' }}
            >
              <div className="flex gap-3">
                {!result && (
                  <button
                    className="btn btn-primary btn-md"
                    onClick={handleAnalyze}
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <><Loader size={16} className="animate-spin" /> מנתח תמונה...</>
                    ) : (
                      <><Cpu size={16} /> נתח עם AI</>
                    )}
                  </button>
                )}
                <button
                  className="btn btn-secondary btn-md"
                  onClick={handleReset}
                >
                  <RefreshCw size={15} />
                  תמונה חדשה
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {analyzing && (
            <div
              className="rounded-2xl p-6 flex items-center gap-4"
              style={{ background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.15)' }}
            >
              <Loader size={20} className="animate-spin" style={{ color: '#d4a017' }} />
              <div>
                <p className="font-semibold" style={{ color: '#f0c040' }}>Claude Vision מנתח את התמונה...</p>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(232,238,248,0.45)' }}>
                  מזהה חומרים, ממצאים ועבודות נדרשות
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analysis Results */}
      {result && (
        <div className="space-y-4">
          {/* Score + summary */}
          <div
            className="rounded-3xl p-6"
            style={{ background: 'rgba(255,255,255,0.96)', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}
          >
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ScoreRing score={result.conditionScore} />
              <div className="flex-1 text-right">
                <div className="flex items-center justify-end gap-2 mb-2 flex-wrap">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: 'rgba(212,160,23,0.12)', color: '#9e7c1a', border: '1px solid rgba(212,160,23,0.25)' }}
                  >
                    {result.roomType}
                  </span>
                  <span className="text-xs text-gray-400">ניתוח AI</span>
                </div>
                <p className="text-slate-800 text-sm leading-relaxed">{result.summary}</p>
              </div>
            </div>
          </div>

          {/* Findings */}
          {result.findings.length > 0 && (
            <div
              className="rounded-3xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.96)', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}
            >
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-amber-500" />
                  <span className="font-bold text-slate-800">ממצאים</span>
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.findings.map((f, i) => {
                  const cfg = SEVERITY_CONFIG[f.severity];
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl p-3"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                    >
                      <span className="text-xl flex-shrink-0">{f.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-800">{f.category}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: `${cfg.color}22` }}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{f.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommended work */}
          {result.recommendedWork.length > 0 && (
            <div
              className="rounded-3xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.96)', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}
            >
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-2">
                  <Wrench size={16} className="text-slate-600" />
                  <span className="font-bold text-slate-800">עבודות מומלצות</span>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {result.recommendedWork.map((w, i) => {
                  const cfg = URGENCY_CONFIG[w.urgency];
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-xl p-3"
                      style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base">{cfg.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{w.item}</p>
                          <p className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                        </div>
                      </div>
                      {w.estimatedCost && (
                        <span className="text-xs font-bold text-slate-600 bg-gray-100 px-2 py-1 rounded-lg whitespace-nowrap">
                          {w.estimatedCost}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Materials */}
          {result.materialsIdentified.length > 0 && (
            <div
              className="rounded-3xl p-5"
              style={{ background: 'rgba(255,255,255,0.96)', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Package size={16} className="text-slate-600" />
                <span className="font-bold text-slate-800">חומרים וחלקים שזוהו</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.materialsIdentified.map((m, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700"
                    style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)' }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Re-analyze */}
          <div className="flex justify-center pt-2">
            <button className="btn btn-outline btn-md" onClick={handleReset}>
              <Camera size={16} />
              נתח תמונה נוספת
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
