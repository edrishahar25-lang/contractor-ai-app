import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Loader, Sparkles, User, Home, Briefcase,
  AlertCircle, CheckCircle, Edit3,
} from 'lucide-react';
import { storage } from '../../lib/storage';

// ── Types ────────────────────────────────────────────────────────────────────

interface VoiceResult {
  client: { name: string; phone: string; address: string; city: string; email: string };
  property: {
    type: 'apartment' | 'house' | 'office' | 'shop' | 'warehouse';
    totalSqm: number;
    rooms: number;
    bathrooms: number;
    condition: 'new' | 'maintained' | 'old' | 'heavy_renovation';
    finishLevel: 'basic' | 'standard' | 'premium' | 'luxury';
  };
  workCategoryIds: string[];
  notes: string;
  missingInfo: string[];
}

// ── Label maps ───────────────────────────────────────────────────────────────

const PROPERTY_TYPE_HE: Record<string, string> = {
  apartment: 'דירה', house: 'בית פרטי', office: 'משרד', shop: 'חנות', warehouse: 'מחסן',
};
const CONDITION_HE: Record<string, string> = {
  new: 'חדש מקבלן', maintained: 'תחוזק', old: 'ישן', heavy_renovation: 'שיפוץ כבד',
};
const FINISH_HE: Record<string, string> = {
  basic: 'בסיסי', standard: 'סטנדרטי', premium: 'פרימיום', luxury: 'יוקרה',
};
const CATEGORY_HE: Record<string, string> = {
  demolition: '🔨 הריסה ופינוי', flooring: '🪨 ריצוף וחיפוי', painting: '🎨 צבע ושפכטל',
  drywall: '🏗️ גבס ותקרות', electrical: '⚡ חשמל', plumbing: '🚿 אינסטלציה',
  kitchen: '🍳 מטבח', bathroom: '🛁 שירותים/אמבטיה', windows: '🪟 חלונות ואלומיניום', ac: '❄️ מזגן',
};

// ── SpeechRecognition shim ───────────────────────────────────────────────────

const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function VoiceQuotePage() {
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speechAvailable] = useState(() => !!SpeechRecognitionAPI);
  const [pulseSize, setPulseSize] = useState(1);
  const recognitionRef = useRef<any>(null);
  const pulseRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (listening) {
      let up = true;
      pulseRef.current = setInterval(() => {
        setPulseSize((v) => {
          const next = up ? v + 0.02 : v - 0.02;
          if (next >= 1.12) up = false;
          if (next <= 0.98) up = true;
          return next;
        });
      }, 50);
    } else {
      clearInterval(pulseRef.current);
      setPulseSize(1);
    }
    return () => clearInterval(pulseRef.current);
  }, [listening]);

  function startListening() {
    if (!SpeechRecognitionAPI) return;
    const rec = new SpeechRecognitionAPI();
    rec.lang = 'he-IL';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text);
    };
    rec.onerror = () => { setListening(false); };
    rec.onend = () => { setListening(false); };
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
    setError(null);
    setResult(null);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function handleParse() {
    if (!transcript.trim()) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/voice/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'שגיאה');
      setResult(data as VoiceResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  function handleCreateProject() {
    if (!result) return;
    const draft = {
      formValues: {
        client: {
          name: result.client.name || '',
          phone: result.client.phone || '',
          email: result.client.email || '',
          address: result.client.address || '',
          city: result.client.city || '',
        },
        property: {
          type: result.property.type || 'apartment',
          totalSqm: result.property.totalSqm || 0,
          rooms: result.property.rooms || 0,
          bathrooms: result.property.bathrooms || 1,
          toilets: 1,
          kitchens: 1,
          balconies: 0,
          ceilingHeight: 2.7,
          hasElevator: false,
          hasParking: false,
          condition: result.property.condition || 'maintained',
          finishLevel: result.property.finishLevel || 'standard',
        },
      },
      selectedItems: [],
      autoOverrides: {},
      step: 0,
    };
    storage.save(storage.wizardDraftKey, draft);
    navigate('/project/new');
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title mb-1">Voice to Quote</h1>
          <p className="page-subtitle">דבר בעברית — AI יחלץ את הפרטים ויפתח הצעה מוכנה</p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{ background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.2)', color: '#f0c040' }}
        >
          <Sparkles size={13} />
          AI Voice
        </div>
      </div>

      {/* Example prompt */}
      {!transcript && !result && (
        <div
          className="rounded-2xl p-4 mb-6 text-sm"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="font-semibold mb-2" style={{ color: 'rgba(232,238,248,0.7)' }}>דוגמה:</p>
          <p
            className="leading-relaxed italic"
            style={{ color: 'rgba(232,238,248,0.45)' }}
          >
            "הצעת מחיר לדוד כהן, רחוב הרצל 12 תל אביב, דירת 3 חדרים 85 מטר, שיפוץ מלא כולל ריצוף, צבע, גבס, חשמל ואינסטלציה, גמר סטנדרטי"
          </p>
        </div>
      )}

      {/* Mic + transcript area */}
      <div
        className="rounded-3xl p-6 mb-5 text-center"
        style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${listening ? 'rgba(212,160,23,0.35)' : 'rgba(255,255,255,0.08)'}`, transition: 'border-color 0.3s' }}
      >
        {/* Mic button */}
        <div className="flex justify-center mb-5">
          <button
            onClick={listening ? stopListening : startListening}
            disabled={!speechAvailable}
            className="relative flex items-center justify-center rounded-full transition-all duration-200"
            style={{
              width: 88,
              height: 88,
              transform: `scale(${pulseSize})`,
              background: listening
                ? 'linear-gradient(135deg, #d4a017 0%, #f0c040 100%)'
                : 'rgba(255,255,255,0.08)',
              boxShadow: listening
                ? '0 0 32px rgba(212,160,23,0.6), 0 0 64px rgba(212,160,23,0.2)'
                : 'none',
              border: `2px solid ${listening ? 'rgba(212,160,23,0.4)' : 'rgba(255,255,255,0.12)'}`,
            }}
          >
            {listening
              ? <MicOff size={32} style={{ color: '#020810' }} />
              : <Mic size={32} style={{ color: listening ? '#020810' : '#d4a017' }} />
            }
          </button>
        </div>

        <p className="text-sm font-semibold mb-1" style={{ color: listening ? '#f0c040' : 'rgba(232,238,248,0.55)' }}>
          {listening ? '🔴 מקליט... לחץ לעצירה' : speechAvailable ? 'לחץ להתחיל הקלטה' : 'הדפדפן לא תומך בזיהוי קול'}
        </p>
        <p className="text-xs mb-4" style={{ color: 'rgba(232,238,248,0.3)' }}>
          {speechAvailable ? 'תומך ב-Chrome ו-Edge' : 'השתמש בשדה הטקסט למטה'}
        </p>

        {/* Transcript textarea */}
        <textarea
          rows={4}
          value={transcript}
          onChange={(e) => { setTranscript(e.target.value); setResult(null); }}
          placeholder="התיאור יופיע כאן... או הקלד ידנית"
          className="input text-sm w-full resize-none text-right"
          style={{ direction: 'rtl' }}
        />

        {transcript && (
          <button
            className="btn btn-primary btn-lg mt-4 w-full sm:w-auto"
            onClick={handleParse}
            disabled={processing}
          >
            {processing ? <Loader size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {processing ? 'AI מנתח...' : 'נתח עם AI'}
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4 fade-up">
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <CheckCircle size={16} style={{ color: '#4ade80' }} />
            <span className="text-sm font-semibold" style={{ color: '#4ade80' }}>
              AI חילץ את הפרטים — בדוק ואשר
            </span>
          </div>

          {/* Client card */}
          <div
            className="rounded-3xl p-5"
            style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-slate-500" />
              <span className="font-bold text-slate-800">פרטי לקוח</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { l: 'שם', v: result.client.name || '—' },
                { l: 'טלפון', v: result.client.phone || '—' },
                { l: 'כתובת', v: result.client.address || '—' },
                { l: 'עיר', v: result.client.city || '—' },
              ].map((r) => (
                <div key={r.l}>
                  <p className="text-xs text-gray-400 mb-0.5">{r.l}</p>
                  <p className={`font-semibold ${r.v === '—' ? 'text-gray-300' : 'text-slate-800'}`}>{r.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Property card */}
          <div
            className="rounded-3xl p-5"
            style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Home size={16} className="text-slate-500" />
              <span className="font-bold text-slate-800">פרטי נכס</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                { l: 'סוג', v: PROPERTY_TYPE_HE[result.property.type] || result.property.type },
                { l: 'שטח', v: result.property.totalSqm > 0 ? `${result.property.totalSqm} מ"ר` : '—' },
                { l: 'חדרים', v: result.property.rooms > 0 ? `${result.property.rooms}` : '—' },
                { l: 'מצב', v: CONDITION_HE[result.property.condition] || result.property.condition },
                { l: 'גמר', v: FINISH_HE[result.property.finishLevel] || result.property.finishLevel },
                { l: 'חד׳ רחצה', v: `${result.property.bathrooms}` },
              ].map((r) => (
                <div key={r.l}>
                  <p className="text-xs text-gray-400 mb-0.5">{r.l}</p>
                  <p className={`font-semibold text-sm ${r.v === '—' ? 'text-gray-300' : 'text-slate-800'}`}>{r.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Work categories */}
          {result.workCategoryIds.length > 0 && (
            <div
              className="rounded-3xl p-5"
              style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Briefcase size={16} className="text-slate-500" />
                <span className="font-bold text-slate-800">עבודות שזוהו</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.workCategoryIds.map((id) => (
                  <span
                    key={id}
                    className="px-3 py-1.5 rounded-xl text-sm font-semibold text-slate-700"
                    style={{ background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.2)' }}
                  >
                    {CATEGORY_HE[id] || id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing info warning */}
          {result.missingInfo.length > 0 && (
            <div
              className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}
            >
              <AlertCircle size={16} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#fbbf24' }}>מידע חסר — תוכל להשלים באשף:</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(251,191,36,0.75)' }}>
                  {result.missingInfo.join(' • ')}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 flex-wrap pt-1">
            <button
              className="btn btn-primary btn-lg flex-1 sm:flex-none"
              onClick={handleCreateProject}
            >
              <CheckCircle size={18} />
              פתח אשף פרויקט עם הנתונים
            </button>
            <button
              className="btn btn-outline btn-lg"
              onClick={() => { setResult(null); setTranscript(''); setError(null); }}
            >
              <Edit3 size={16} />
              תיאור חדש
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
