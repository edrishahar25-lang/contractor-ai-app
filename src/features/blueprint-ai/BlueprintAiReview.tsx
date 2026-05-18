import { useState } from 'react';
import {
  CheckCircle, XCircle, Edit2, Save, AlertTriangle, Info,
  ChevronDown, ChevronUp, CheckSquare, Square, ArrowLeft,
} from 'lucide-react';
import type {
  AiBlueprintAnalysis, AiDetectedRoom, AiDetectedWorkItem,
  RoomType, SuggestionStatus,
} from './blueprintAiTypes';

// ─── Labels ───────────────────────────────────────────────────────────────────

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  living: 'סלון/מגורים',
  bedroom: 'חדר שינה',
  bathroom: 'חדר רחצה',
  toilet: 'שירותים',
  kitchen: 'מטבח',
  balcony: 'מרפסת',
  hallway: 'מסדרון/כניסה',
  other: 'אחר',
};

const UNIT_LABELS: Record<string, string> = {
  sqm: 'מ"ר', meter: 'מטר', unit: 'יח\'', complete: 'קומפלט',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  if (value >= 0.85) {
    return <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">{pct}%</span>;
  }
  if (value >= 0.65) {
    return <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">{pct}%</span>;
  }
  return <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">{pct}%</span>;
}

function rowBg(status: SuggestionStatus) {
  if (status === 'approved') return 'bg-green-50/60 border-r-2 border-green-400';
  if (status === 'edited')   return 'bg-amber-50/60 border-r-2 border-amber-400';
  if (status === 'rejected') return 'bg-gray-50 opacity-50';
  return '';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientInfo {
  name: string;
  phone: string;
  address: string;
  city: string;
}

interface Props {
  analysis: AiBlueprintAnalysis;
  blueprintId?: string;
  isMock: boolean;
  onApprove: (approvedAnalysis: AiBlueprintAnalysis, client: ClientInfo) => void;
  onBack: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BlueprintAiReview({ analysis, blueprintId, isMock, onApprove, onBack }: Props) {
  const [rooms, setRooms] = useState<AiDetectedRoom[]>(analysis.rooms);
  const [workItems, setWorkItems] = useState<AiDetectedWorkItem[]>(analysis.detectedWorkItems);

  // Inline editing
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  // Client form
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Section collapse
  const [showMissing, setShowMissing] = useState(true);

  // ── Room actions ────────────────────────────────────────────────────────────

  function setRoomStatus(id: string, status: SuggestionStatus) {
    setRooms((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
  }

  function startEditRoom(room: AiDetectedRoom) {
    setEditingRoomId(room.id);
    setEditVal(String(room.estimatedSqm));
  }

  function saveEditRoom(id: string) {
    const val = parseFloat(editVal);
    if (!val || val <= 0) { setEditingRoomId(null); return; }
    setRooms((prev) => prev.map((r) =>
      r.id === id ? { ...r, estimatedSqm: val, status: 'edited' } : r,
    ));
    setEditingRoomId(null);
  }

  function approveAllRooms() {
    setRooms((prev) => prev.map((r) => r.status === 'pending' ? { ...r, status: 'approved' } : r));
  }

  // ── Work item actions ───────────────────────────────────────────────────────

  function setItemStatus(id: string, status: SuggestionStatus) {
    setWorkItems((prev) => prev.map((it) => it.id === id ? { ...it, status } : it));
  }

  function startEditItem(item: AiDetectedWorkItem) {
    setEditingItemId(item.id);
    setEditVal(String(item.quantity));
  }

  function saveEditItem(id: string) {
    const val = parseFloat(editVal);
    if (!val || val <= 0) { setEditingItemId(null); return; }
    setWorkItems((prev) => prev.map((it) =>
      it.id === id ? { ...it, quantity: val, status: 'edited' } : it,
    ));
    setEditingItemId(null);
  }

  function approveAllItems() {
    setWorkItems((prev) => prev.map((it) => it.status === 'pending' ? { ...it, status: 'approved' } : it));
  }

  // ── Confirm ─────────────────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!clientName.trim() || clientName.trim().length < 2) errs.name = 'שם חובה';
    if (!clientPhone.trim() || !/^0[2-9]\d{7,8}$/.test(clientPhone.trim())) errs.phone = 'מספר ישראלי לא תקין';
    if (!clientAddress.trim()) errs.address = 'כתובת חובה';
    if (!clientCity.trim()) errs.city = 'עיר חובה';
    const hasApproved = rooms.some((r) => r.status !== 'rejected') ||
                        workItems.some((it) => it.status !== 'rejected');
    if (!hasApproved) errs.general = 'יש לאשר לפחות פריט אחד';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleConfirm() {
    if (!validate()) return;

    if (blueprintId && !isMock) {
      const corrections: Array<{ fieldType: string; itemId: string; aiValue: string | number; correctedValue: string | number }> = [];

      rooms.forEach((room) => {
        const original = analysis.rooms.find((r) => r.id === room.id);
        if (original && room.status === 'edited' && room.estimatedSqm !== original.estimatedSqm) {
          corrections.push({ fieldType: 'room_sqm', itemId: room.name, aiValue: original.estimatedSqm, correctedValue: room.estimatedSqm });
        }
        if (original && room.status === 'rejected') {
          corrections.push({ fieldType: 'room_rejected', itemId: room.name, aiValue: original.estimatedSqm, correctedValue: 'rejected' });
        }
      });

      workItems.forEach((item) => {
        const original = analysis.detectedWorkItems.find((it) => it.id === item.id);
        if (original && item.status === 'edited' && item.quantity !== original.quantity) {
          corrections.push({ fieldType: 'work_qty', itemId: item.itemId, aiValue: original.quantity, correctedValue: item.quantity });
        }
        if (original && item.status === 'rejected') {
          corrections.push({ fieldType: 'work_rejected', itemId: item.itemId, aiValue: original.quantity, correctedValue: 'rejected' });
        }
      });

      if (corrections.length > 0) {
        fetch(`/api/blueprint/${blueprintId}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ corrections }),
        }).catch(() => { /* non-fatal */ });
      }
    }

    const approvedAnalysis: AiBlueprintAnalysis = {
      ...analysis,
      rooms,
      detectedWorkItems: workItems,
    };
    onApprove(approvedAnalysis, {
      name: clientName.trim(),
      phone: clientPhone.trim(),
      address: clientAddress.trim(),
      city: clientCity.trim(),
    });
  }

  // ── Summary stats ───────────────────────────────────────────────────────────

  const approvedRooms = rooms.filter((r) => r.status !== 'rejected');
  const totalSqm = approvedRooms.reduce((s, r) => s + r.estimatedSqm, 0);
  const bathroomCount = approvedRooms.filter((r) => ['bathroom', 'toilet'].includes(r.type)).length;
  const kitchenCount = approvedRooms.filter((r) => r.type === 'kitchen').length;
  const pendingCount = rooms.filter((r) => r.status === 'pending').length + workItems.filter((it) => it.status === 'pending').length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-auto bg-slate-50" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 py-5 pb-16">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">סקירת ניתוח תוכנית</h1>
            <p className="text-sm text-gray-500">אשר, ערוך או דחה את הסעיפים שהתגלו</p>
          </div>
          {pendingCount > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">
              {pendingCount} ממתינים לאישור
            </span>
          )}
        </div>

        {/* Mock / test mode banner */}
        {isMock && (
          <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl mb-4">
            <Info size={15} className="text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-purple-800">מצב בדיקה — לא ניתוח AI אמיתי</p>
              <p className="text-xs text-purple-600 mt-0.5">
                הנתונים שלהלן הם הדגמה בלבד. כאשר ה-AI backend יהיה פעיל, תוצאות אמיתיות יוצגו כאן.
              </p>
            </div>
          </div>
        )}

        {/* Global warnings */}
        {analysis.globalWarnings.filter((w) => !w.includes('מצב בדיקה')).length > 0 && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
            <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              {analysis.globalWarnings
                .filter((w) => !w.includes('מצב בדיקה'))
                .map((w, i) => (
                  <p key={i} className="text-xs text-amber-800">{w}</p>
                ))}
            </div>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'שטח כולל', value: `${totalSqm.toFixed(0)} מ"ר` },
            { label: 'חדרים', value: String(approvedRooms.filter((r) => ['bedroom', 'living'].includes(r.type)).length) },
            { label: 'שירותים', value: String(bathroomCount) },
            { label: 'מטבחים', value: String(kitchenCount) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl p-3 border border-gray-100 text-center shadow-sm">
              <div className="text-xs text-gray-500 mb-0.5">{label}</div>
              <div className="text-xl font-black text-slate-900">{value}</div>
            </div>
          ))}
        </div>

        {/* ── Rooms table ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white">
            <div>
              <span className="font-bold text-sm">חדרים שזוהו</span>
              <span className="text-white/40 text-xs mr-2">({rooms.length} חדרים)</span>
            </div>
            <button
              onClick={approveAllRooms}
              className="flex items-center gap-1.5 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-300 px-2.5 py-1 rounded-lg transition-colors"
            >
              <CheckSquare size={12} />
              אשר הכל
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {rooms.map((room) => (
              <div key={room.id} className={`flex items-center gap-2 px-4 py-2.5 transition-colors ${rowBg(room.status)}`}>
                {/* Room info */}
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${room.status === 'rejected' ? 'line-through text-gray-400' : 'text-slate-800'}`}>
                    {room.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {ROOM_TYPE_LABELS[room.type]}
                    </span>
                    {room.sourceText && (
                      <span className="text-xs text-blue-500 italic truncate max-w-40">{room.sourceText}</span>
                    )}
                    {room.warnings?.map((w, i) => (
                      <span key={i} className="text-xs text-amber-600 flex items-center gap-0.5">
                        <AlertTriangle size={10} />{w}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Sqm — editable */}
                <div className="w-20 text-center">
                  {editingRoomId === room.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEditRoom(room.id)}
                        className="w-14 text-center border border-amber-400 rounded-lg px-1 py-1 text-sm"
                        autoFocus
                      />
                      <button onClick={() => saveEditRoom(room.id)} className="text-green-600">
                        <Save size={13} />
                      </button>
                    </div>
                  ) : (
                    <span className={`text-sm font-bold ${room.status === 'rejected' ? 'text-gray-400' : 'text-slate-700'}`}>
                      {room.estimatedSqm} מ"ר
                    </span>
                  )}
                </div>

                {/* Confidence */}
                <div className="w-12 text-center">
                  <ConfidenceBadge value={room.confidence} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {room.status !== 'approved' && room.status !== 'edited' ? (
                    <button
                      onClick={() => setRoomStatus(room.id, 'approved')}
                      title="אשר"
                      className="p-1 rounded-lg hover:bg-green-100 text-gray-400 hover:text-green-600 transition-colors"
                    >
                      <CheckCircle size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setRoomStatus(room.id, 'pending')}
                      title="בטל אישור"
                      className="p-1 rounded-lg text-green-500"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => startEditRoom(room)}
                    title="ערוך שטח"
                    className="p-1 rounded-lg hover:bg-amber-100 text-gray-400 hover:text-amber-600 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setRoomStatus(room.id, room.status === 'rejected' ? 'pending' : 'rejected')}
                    title={room.status === 'rejected' ? 'שחזר' : 'דחה'}
                    className={`p-1 rounded-lg transition-colors ${room.status === 'rejected' ? 'text-red-500' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Detected work items ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-700 text-white">
            <div>
              <span className="font-bold text-sm">כמויות עבודה שזוהו</span>
              <span className="text-white/40 text-xs mr-2">({workItems.length} סעיפים)</span>
            </div>
            <button
              onClick={approveAllItems}
              className="flex items-center gap-1.5 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-300 px-2.5 py-1 rounded-lg transition-colors"
            >
              <CheckSquare size={12} />
              אשר הכל
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {workItems.map((item) => (
              <div key={item.id} className={`flex items-center gap-2 px-4 py-2.5 transition-colors ${rowBg(item.status)}`}>
                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${item.status === 'rejected' ? 'line-through text-gray-400' : 'text-slate-800'}`}>
                    {item.itemId}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">{item.reasoningSummary}</div>
                  {item.warnings?.map((w, i) => (
                    <div key={i} className="text-xs text-amber-600 flex items-center gap-0.5 mt-0.5">
                      <AlertTriangle size={10} />{w}
                    </div>
                  ))}
                </div>

                {/* Quantity — editable */}
                <div className="w-24 text-center">
                  {editingItemId === item.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEditItem(item.id)}
                        className="w-14 text-center border border-amber-400 rounded-lg px-1 py-1 text-sm"
                        autoFocus
                      />
                      <button onClick={() => saveEditItem(item.id)} className="text-green-600">
                        <Save size={13} />
                      </button>
                    </div>
                  ) : (
                    <span className={`text-sm font-bold ${item.status === 'rejected' ? 'text-gray-400' : 'text-slate-700'}`}>
                      {item.quantity} {UNIT_LABELS[item.unit] ?? item.unit}
                    </span>
                  )}
                </div>

                {/* Confidence */}
                <div className="w-12 text-center">
                  <ConfidenceBadge value={item.confidence} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {item.status !== 'approved' && item.status !== 'edited' ? (
                    <button
                      onClick={() => setItemStatus(item.id, 'approved')}
                      className="p-1 rounded-lg hover:bg-green-100 text-gray-400 hover:text-green-600 transition-colors"
                    >
                      <CheckCircle size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setItemStatus(item.id, 'pending')}
                      className="p-1 rounded-lg text-green-500"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => startEditItem(item)}
                    className="p-1 rounded-lg hover:bg-amber-100 text-gray-400 hover:text-amber-600 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setItemStatus(item.id, item.status === 'rejected' ? 'pending' : 'rejected')}
                    className={`p-1 rounded-lg transition-colors ${item.status === 'rejected' ? 'text-red-500' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 bg-slate-50 border-t border-gray-100 text-xs text-gray-500 text-right">
            כמויות אלה יתווספו לכתב הכמויות הנגזר מהחדרים שאושרו
          </div>
        </div>

        {/* ── Missing info questions ─────────────────────────────────────── */}
        {analysis.missingInfoQuestions.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => setShowMissing((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <Info size={15} className="text-blue-500" />
                <span className="font-bold text-sm text-slate-800">
                  שאלות שנותרו לאימות ({analysis.missingInfoQuestions.length})
                </span>
              </div>
              {showMissing ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
            </button>
            {showMissing && (
              <ul className="px-4 pb-3 space-y-1.5">
                {analysis.missingInfoQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Square size={14} className="text-blue-300 mt-0.5 flex-shrink-0" />
                    {q}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Client info form ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
          <div className="px-4 py-3 bg-slate-800 text-white">
            <span className="font-bold text-sm">פרטי לקוח ליצירת הפרויקט</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="label">שם לקוח *</label>
                <input
                  className={`input ${formErrors.name ? 'border-red-400' : ''}`}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="ישראל ישראלי"
                />
                {formErrors.name && <p className="error-msg">{formErrors.name}</p>}
              </div>
              <div>
                <label className="label">טלפון *</label>
                <input
                  className={`input ${formErrors.phone ? 'border-red-400' : ''}`}
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="0501234567"
                  type="tel"
                />
                {formErrors.phone && <p className="error-msg">{formErrors.phone}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">כתובת *</label>
                  <input
                    className={`input ${formErrors.address ? 'border-red-400' : ''}`}
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="רחוב הרצל 1"
                  />
                  {formErrors.address && <p className="error-msg">{formErrors.address}</p>}
                </div>
                <div>
                  <label className="label">עיר *</label>
                  <input
                    className={`input ${formErrors.city ? 'border-red-400' : ''}`}
                    value={clientCity}
                    onChange={(e) => setClientCity(e.target.value)}
                    placeholder="תל אביב"
                  />
                  {formErrors.city && <p className="error-msg">{formErrors.city}</p>}
                </div>
              </div>
            </div>
            {formErrors.general && (
              <p className="text-sm text-red-500 mt-2">{formErrors.general}</p>
            )}
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="btn btn-outline btn-md"
          >
            חזרה לתוכנית
          </button>
          <button
            onClick={handleConfirm}
            className="btn btn-primary btn-lg flex items-center gap-2"
          >
            <CheckCircle size={18} />
            אשר ובנה כתב כמויות
          </button>
        </div>

      </div>
    </div>
  );
}
