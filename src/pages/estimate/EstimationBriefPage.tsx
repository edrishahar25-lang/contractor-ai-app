import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, AlertTriangle, Info, Zap, Cpu } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { generateBOQFromBrief, boqItemsToSelectedItems } from '../../lib/boqGenerator';
import { calculateAutoAssumptions } from '../../lib/pricingEngine';
import { estimateFromBriefAi } from '../../features/estimation-ai/estimationAiService';
import type { EstimationBrief, RenovationType } from '../../types/boq';
import type { Client, Property, SelectedWorkItem } from '../../types';
import { Button, Alert } from '../../components/ui';
import { findWorkItem } from '../../data/workCategories';
import { inferMaterialLaborSplit } from '../../lib/pricingEngine';

const RENOVATION_TYPES: { value: RenovationType; label: string; desc: string }[] = [
  { value: 'general',    label: 'שיפוץ כללי',        desc: 'ריצוף, צבע, חשמל, אינסטלציה' },
  { value: 'complete',   label: 'שיפוץ קומפלט',       desc: 'כולל הריסה, כל מערכות' },
  { value: 'heavy',      label: 'שיפוץ כבד',          desc: 'הריסה מאסיבית + בנייה מחדש' },
  { value: 'bathroom',   label: 'חדר רחצה בלבד',      desc: 'אינסטלציה, חיפוי, כלים' },
  { value: 'kitchen',    label: 'מטבח בלבד',          desc: 'ארונות, שיש, חשמל, אינסטלציה' },
  { value: 'painting',   label: 'צבע בלבד',           desc: 'צבע קירות ותקרות' },
  { value: 'flooring',   label: 'ריצוף בלבד',         desc: 'פירוק ריצוף קיים + ריצוף חדש' },
  { value: 'electrical', label: 'חשמל ואינסטלציה',    desc: 'נקודות חשמל ומים בלבד' },
];

export default function EstimationBriefPage() {
  const navigate = useNavigate();
  const { createProject } = useProjectStore();
  const { pricing } = useSettingsStore();

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');

  const [totalSqm, setTotalSqm] = useState(80);
  const [rooms, setRooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(1);
  const [toilets, setToilets] = useState(1);
  const [kitchens, setKitchens] = useState(1);
  const [balconies, setBalconies] = useState(0);
  const [renovationType, setRenovationType] = useState<RenovationType>('general');
  const [propertyType] = useState<Property['type']>('apartment');
  const [condition, setCondition] = useState<Property['condition']>('maintained');
  const [finishLevel, setFinishLevel] = useState<Property['finishLevel']>('standard');
  const [description, setDescription] = useState('');

  const [useAi, setUseAi] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [boqWarnings, setBoqWarnings] = useState<string[]>([]);
  const [aiError, setAiError] = useState('');

  function validate() {
    const errs: Record<string, string> = {};
    if (!clientName.trim() || clientName.trim().length < 2) errs.name = 'שם חובה (לפחות 2 תווים)';
    if (!clientPhone.trim() || !/^0[2-9]\d{7,8}$/.test(clientPhone.trim())) errs.phone = 'מספר טלפון ישראלי לא תקין';
    if (!clientAddress.trim()) errs.address = 'כתובת חובה';
    if (!clientCity.trim()) errs.city = 'עיר חובה';
    if (totalSqm <= 0) errs.sqm = 'שטח חייב להיות חיובי';
    if (rooms < 1) errs.rooms = 'לפחות חדר אחד';
    return errs;
  }

  async function handleGenerate() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setGenerating(true);
    setAiError('');

    const brief: EstimationBrief = {
      propertyType,
      totalSqm,
      rooms,
      bathrooms,
      toilets,
      kitchens,
      balconies,
      renovationType,
      finishLevel,
      condition,
      description,
    };

    let selectedItems: SelectedWorkItem[];
    let warnings: string[] = [];

    if (useAi) {
      try {
        const aiResult = await estimateFromBriefAi({ ...brief, description: brief.description ?? '' });
        warnings = [...aiResult.warnings, ...aiResult.missingInfo];
        const m = pricing.priceMultiplier ?? 1.0;
        selectedItems = aiResult.items.map((item) => {
          const totalPrice = (pricing.itemPrices[item.name] ?? pricing.itemPrices[item.itemId] ?? 0) * m;
          const def = findWorkItem(item.itemId);
          const { material, labor } = inferMaterialLaborSplit(totalPrice || 0, def?.costType ?? 'mixed');
          return {
            categoryId: item.categoryId,
            itemId: item.itemId,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: material + labor,
            materialUnitCost: material,
            laborUnitCost: labor,
            notes: item.reasoning,
            source: 'ai_suggestion' as const,
          };
        });
      } catch (err: any) {
        setAiError(err.message ?? 'שגיאת AI — נסה שוב');
        setGenerating(false);
        return;
      }
    } else {
      const result = generateBOQFromBrief(brief, pricing);
      warnings = result.warnings;
      selectedItems = boqItemsToSelectedItems(result.items);
    }

    setBoqWarnings(warnings);

    const client: Client = {
      name: clientName.trim(),
      phone: clientPhone.trim(),
      address: clientAddress.trim(),
      city: clientCity.trim(),
    };

    const property: Property = {
      type: propertyType,
      totalSqm,
      rooms,
      bathrooms,
      toilets,
      kitchens,
      balconies,
      ceilingHeight: 2.7,
      hasElevator: false,
      hasParking: false,
      condition,
      finishLevel,
    };

    const autoOverrides = calculateAutoAssumptions(property);
    const project = createProject(client, property, selectedItems, autoOverrides,
      useAi ? 'נוצר בעזרת AI מתיאור פרויקט' : 'נוצר מתיאור פרויקט');
    navigate(`/project/${project.id}/boq`);
  }

  return (
    <div className="page-container max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="page-title mb-0">הפקת הצעה מתיאור</h1>
          <p className="page-subtitle mb-0">תאר את הפרויקט — המערכת תייצר כתב כמויות לבדיקה ועריכה</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setUseAi(false)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
            !useAi ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          <Zap size={15} />
          נוסחאות אוטומטיות
        </button>
        <button
          type="button"
          onClick={() => setUseAi(true)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
            useAi ? 'border-purple-500 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          <Cpu size={15} />
          ניתוח AI
        </button>
      </div>

      {/* Mode description */}
      {useAi ? (
        <div className="flex gap-3 p-4 bg-purple-50 border border-purple-200 rounded-2xl mb-5">
          <Sparkles size={16} className="text-purple-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-purple-800 font-semibold">מצב AI — ניתוח חכם של הפרויקט</p>
            <p className="text-xs text-purple-600 mt-0.5">
              Claude יקרא את פרטי הנכס והתיאור החופשי ויבנה כתב כמויות מותאם. ניתן לערוך את כל הפריטים לאחר הפקה.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-5">
          <Zap size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 font-semibold">מצב נוסחאות — חישוב מהיר ומדויק</p>
            <p className="text-xs text-amber-600 mt-0.5">
              כמויות מחושבות לפי נוסחאות ישראליות סטנדרטיות. מהיר ואמין לפרויקטים טיפוסיים.
            </p>
          </div>
        </div>
      )}

      {aiError && (
        <Alert variant="error" icon={<AlertTriangle size={14} />} className="mb-4">
          {aiError}
        </Alert>
      )}

      {boqWarnings.length > 0 && (
        <Alert variant="warning" icon={<AlertTriangle size={14} />} className="mb-4">
          {boqWarnings.join(' | ')}
        </Alert>
      )}

      <div className="space-y-5">
        {/* Client */}
        <div className="card p-5">
          <p className="text-xs font-bold text-gray-500 uppercase mb-3">פרטי לקוח</p>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="label">שם לקוח *</label>
              <input className={`input ${errors.name ? 'border-red-400' : ''}`} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="ישראל ישראלי" />
              {errors.name && <p className="error-msg">{errors.name}</p>}
            </div>
            <div>
              <label className="label">טלפון *</label>
              <input className={`input ${errors.phone ? 'border-red-400' : ''}`} value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="0501234567" type="tel" />
              {errors.phone && <p className="error-msg">{errors.phone}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">כתובת *</label>
                <input className={`input ${errors.address ? 'border-red-400' : ''}`} value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="רחוב הרצל 1" />
                {errors.address && <p className="error-msg">{errors.address}</p>}
              </div>
              <div>
                <label className="label">עיר *</label>
                <input className={`input ${errors.city ? 'border-red-400' : ''}`} value={clientCity} onChange={(e) => setClientCity(e.target.value)} placeholder="תל אביב" />
                {errors.city && <p className="error-msg">{errors.city}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Property details */}
        <div className="card p-5">
          <p className="text-xs font-bold text-gray-500 uppercase mb-3">פרטי נכס</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {([
              { label: 'שטח מ"ר *', value: totalSqm, set: setTotalSqm, err: errors.sqm },
              { label: 'חדרים *',   value: rooms,    set: setRooms,    err: errors.rooms },
              { label: 'שירותים',   value: bathrooms, set: setBathrooms, err: '' },
            ] as const).map(({ label, value, set, err }) => (
              <div key={label}>
                <label className="label">{label}</label>
                <input type="number" min={0} className={`input ${err ? 'border-red-400' : ''}`}
                  value={value} onChange={(e) => (set as (v: number) => void)(parseInt(e.target.value) || 0)} />
                {err && <p className="error-msg">{err}</p>}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {([
              { label: 'שירותים נוספים', value: toilets,   set: setToilets },
              { label: 'מטבחים',         value: kitchens,  set: setKitchens },
              { label: 'מרפסות',         value: balconies, set: setBalconies },
            ] as const).map(({ label, value, set }) => (
              <div key={label}>
                <label className="label">{label}</label>
                <input type="number" min={0} className="input"
                  value={value} onChange={(e) => (set as (v: number) => void)(parseInt(e.target.value) || 0)} />
              </div>
            ))}
          </div>
        </div>

        {/* Renovation type */}
        <div className="card p-5">
          <p className="text-xs font-bold text-gray-500 uppercase mb-3">סוג שיפוץ</p>
          <div className="grid grid-cols-2 gap-2">
            {RENOVATION_TYPES.map((rt) => (
              <button
                key={rt.value}
                type="button"
                onClick={() => setRenovationType(rt.value)}
                className={`text-right px-3 py-2.5 rounded-xl border-2 transition-all ${
                  renovationType === rt.value
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-amber-300'
                }`}
              >
                <div className="font-semibold text-sm text-slate-800">{rt.label}</div>
                <div className="text-xs text-gray-500">{rt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Finish + condition */}
        <div className="card p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">רמת גמר</label>
              <select className="input" value={finishLevel} onChange={(e) => setFinishLevel(e.target.value as Property['finishLevel'])}>
                <option value="basic">בסיסית</option>
                <option value="standard">סטנדרט</option>
                <option value="premium">פרימיום</option>
                <option value="luxury">יוקרה</option>
              </select>
            </div>
            <div>
              <label className="label">מצב נכס</label>
              <select className="input" value={condition} onChange={(e) => setCondition(e.target.value as Property['condition'])}>
                <option value="new">חדש</option>
                <option value="maintained">שמור</option>
                <option value="old">ישן</option>
                <option value="heavy_renovation">שיפוץ כבד</option>
              </select>
            </div>
          </div>
        </div>

        {/* Free-text description */}
        <div className="card p-5">
          <label className="label">
            תיאור חופשי
            {useAi && <span className="mr-1 text-purple-600 text-xs">(ממליץ — AI ינתח את התיאור)</span>}
          </label>
          <textarea
            className="input resize-none"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={useAi
              ? 'דירת 5 חדרים, 180 מטר, שני שירותים, מרפסת אחת. שיפוץ כללי ברמת גמר פרימיום. מרצפות פורצלן, ארון מטבח חדש, 2 מזגנים...'
              : 'תיאור אופציונלי — ניתן לערוך את הכמויות בשלב הבא.'}
          />
          {useAi && (
            <div className="flex items-start gap-2 mt-2">
              <Info size={13} className="text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400">ככל שהתיאור מפורט יותר, AI יוכל להתאים את הכמויות טוב יותר.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" onClick={() => navigate(-1)}>ביטול</Button>
        <Button
          size="lg"
          onClick={handleGenerate}
          loading={generating}
          className={useAi ? 'bg-purple-600 hover:bg-purple-700' : ''}
        >
          {useAi ? <Cpu size={18} /> : <Sparkles size={18} />}
          {useAi ? 'הפק כתב כמויות עם AI' : 'הפק כתב כמויות לבדיקה'}
        </Button>
      </div>
    </div>
  );
}
