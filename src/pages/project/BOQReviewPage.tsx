import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle, FileText, Edit2, Save } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { formatCurrency, UNIT_LABELS } from '../../lib/format';
import { findWorkItem } from '../../data/workCategories';
import type { SelectedWorkItem } from '../../types';
import { Button, Card, CardHeader, Alert, Badge } from '../../components/ui';

const SOURCE_LABELS: Record<string, { text: string; variant: 'blue' | 'green' | 'yellow' | 'gray' }> = {
  manual:          { text: 'ידני',       variant: 'gray' },
  blueprint:       { text: 'תוכנית',     variant: 'blue' },
  system_estimate: { text: 'הערכה',      variant: 'yellow' },
  ai_suggestion:   { text: 'AI',         variant: 'blue' },
  merged:          { text: 'ממוזג',      variant: 'green' },
  manual_override: { text: 'נערך ידנית', variant: 'yellow' },
};

export default function BOQReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, createVersionWithItems } = useProjectStore();

  const project = id ? getProject(id) : undefined;
  const version = project?.versions.find((v) => v.id === project.currentVersionId);

  const [items, setItems] = useState<SelectedWorkItem[]>(version?.selectedItems ?? []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editMat, setEditMat] = useState('');
  const [editLab, setEditLab] = useState('');
  const [saving, setSaving] = useState(false);

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

  function startEdit(item: SelectedWorkItem) {
    setEditingId(item.itemId);
    setEditQty(String(item.quantity));
    setEditMat(String(item.materialUnitCost ?? ''));
    setEditLab(String(item.laborUnitCost ?? ''));
  }

  function saveEdit(itemId: string) {
    const qty = parseFloat(editQty) || 0;
    const mat = editMat !== '' ? parseFloat(editMat) : undefined;
    const lab = editLab !== '' ? parseFloat(editLab) : undefined;
    setItems((prev) => prev.map((it) => {
      if (it.itemId !== itemId) return it;
      const matVal = mat ?? it.materialUnitCost;
      const labVal = lab ?? it.laborUnitCost;
      const unitPrice = matVal !== undefined && labVal !== undefined
        ? matVal + labVal
        : it.unitPrice;
      return { ...it, quantity: qty, materialUnitCost: matVal, laborUnitCost: labVal, unitPrice, source: 'manual_override' as const };
    }));
    setEditingId(null);
  }

  function removeItem(itemId: string) {
    setItems((prev) => prev.filter((it) => it.itemId !== itemId));
  }

  async function handleSaveAsVersion() {
    if (!project) return;
    setSaving(true);
    createVersionWithItems(project.id, items, 'לאחר בדיקת כתב כמויות');
    navigate(`/project/${project.id}/estimate`);
  }

  // Live totals for display
  const materialTotal = items.reduce((s, it) => {
    const mat = it.materialUnitCost ?? 0;
    return s + it.quantity * mat;
  }, 0);
  const laborTotal = items.reduce((s, it) => {
    const lab = it.laborUnitCost ?? 0;
    return s + it.quantity * lab;
  }, 0);
  const legacyTotal = items.reduce((s, it) => {
    if (it.materialUnitCost === undefined) return s + it.quantity * it.unitPrice;
    return s;
  }, 0);
  const grandTotal = materialTotal + laborTotal + legacyTotal;

  // Duplicate warnings
  const hasBathComplete = items.some((i) => i.itemId === 'bath_full');
  const hasBathIndividual = items.some((i) => ['plumb_toilet', 'plumb_sink'].includes(i.itemId));
  const hasKitchenComplete = items.some((i) => i.itemId === 'kitch_cabinets');
  const hasKitchenIndividual = items.some((i) => ['kitch_sink', 'kitch_tap', 'kitch_marble'].includes(i.itemId));

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(`/project/${id}`)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="page-title mb-0">בדיקת כתב כמויות</h1>
          <p className="text-sm text-gray-500">{project.client.name} · ערוך כמויות לפני יצירת הצעת מחיר</p>
        </div>
      </div>

      {/* Duplicate warnings */}
      {(hasBathComplete && hasBathIndividual) && (
        <Alert variant="warning" icon={<AlertTriangle size={15} />} className="mb-4">
          תיתכן כפילות: שיפוץ חדר רחצה קומפלט כולל חלק מהסעיפים שסומנו בנפרד.
        </Alert>
      )}
      {(hasKitchenComplete && hasKitchenIndividual) && (
        <Alert variant="warning" icon={<AlertTriangle size={15} />} className="mb-4">
          תיתכן כפילות: מטבח קומפלט כולל חלק מהסעיפים שסומנו בנפרד.
        </Alert>
      )}

      {/* BOQ table */}
      <Card className="mb-5 overflow-hidden">
        <CardHeader>
          <h2 className="font-bold text-slate-900">פריטי עבודה</h2>
          <Badge variant="gray">{items.length} פריטים</Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-right px-4 py-2.5 font-semibold">פריט</th>
                <th className="text-center px-3 py-2.5 font-semibold w-20">כמות</th>
                <th className="text-center px-3 py-2.5 font-semibold w-16">יחידה</th>
                <th className="text-center px-3 py-2.5 font-semibold w-24 hidden md:table-cell">חומר/יח'</th>
                <th className="text-center px-3 py-2.5 font-semibold w-24 hidden md:table-cell">עבודה/יח'</th>
                <th className="text-left px-4 py-2.5 font-semibold w-28">סה"כ</th>
                <th className="w-20 px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const def = findWorkItem(item.itemId);
                const isEditing = editingId === item.itemId;
                const src = SOURCE_LABELS[item.source ?? 'manual'];
                const lineTotal = item.materialUnitCost !== undefined
                  ? item.quantity * (item.materialUnitCost + (item.laborUnitCost ?? 0))
                  : item.quantity * item.unitPrice;

                return (
                  <tr key={item.itemId} className={`border-t border-gray-100 ${isEditing ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-800">{def?.name ?? item.itemId}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {src && <Badge variant={src.variant}>{src.text}</Badge>}
                        {item.notes && <span className="text-xs text-gray-400 truncate max-w-40">{item.notes}</span>}
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="px-3 py-2.5 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          className="w-16 text-center border border-amber-400 rounded-lg px-1 py-1 text-sm"
                        />
                      ) : (
                        <span className="text-slate-700">{item.quantity}</span>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="px-3 py-2.5 text-center text-gray-500 text-xs">
                      {UNIT_LABELS[item.unit]}
                    </td>

                    {/* Material cost */}
                    <td className="px-3 py-2.5 text-center hidden md:table-cell">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editMat}
                          onChange={(e) => setEditMat(e.target.value)}
                          placeholder="חומר"
                          className="w-20 text-center border border-blue-300 rounded-lg px-1 py-1 text-xs"
                        />
                      ) : (
                        <span className="text-blue-700 text-xs">
                          {item.materialUnitCost !== undefined ? formatCurrency(item.materialUnitCost) : '—'}
                        </span>
                      )}
                    </td>

                    {/* Labor cost */}
                    <td className="px-3 py-2.5 text-center hidden md:table-cell">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editLab}
                          onChange={(e) => setEditLab(e.target.value)}
                          placeholder="עבודה"
                          className="w-20 text-center border border-green-300 rounded-lg px-1 py-1 text-xs"
                        />
                      ) : (
                        <span className="text-green-700 text-xs">
                          {item.laborUnitCost !== undefined ? formatCurrency(item.laborUnitCost) : '—'}
                        </span>
                      )}
                    </td>

                    {/* Total */}
                    <td className="px-4 py-2.5 font-bold text-slate-900">
                      {formatCurrency(lineTotal)}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <button onClick={() => saveEdit(item.itemId)} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200">
                            <Save size={13} />
                          </button>
                        ) : (
                          <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                            <Edit2 size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => removeItem(item.itemId)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      <Card className="mb-6">
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-blue-500 font-semibold mb-1">עלות חומר</div>
              <div className="text-lg font-extrabold text-blue-700">{formatCurrency(materialTotal)}</div>
            </div>
            <div>
              <div className="text-xs text-green-500 font-semibold mb-1">עלות עבודה</div>
              <div className="text-lg font-extrabold text-green-700">{formatCurrency(laborTotal)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold mb-1">סה"כ לפני מכפילים</div>
              <div className="text-xl font-black text-slate-900">{formatCurrency(grandTotal)}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate(`/project/${id}`)}>ביטול</Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/project/${id}/estimate`)}
          >
            <FileText size={16} />
            לא לשמור — פתח הצעה נוכחית
          </Button>
          <Button size="lg" onClick={handleSaveAsVersion} loading={saving}>
            <CheckCircle size={16} />
            אשר כמויות — צור גרסת הצעה חדשה
          </Button>
        </div>
      </div>
    </div>
  );
}
