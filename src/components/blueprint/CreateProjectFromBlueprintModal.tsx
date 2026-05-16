import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertTriangle } from 'lucide-react';
import { useBlueprintStore } from '../../stores/blueprintStore';
import { useProjectStore } from '../../stores/projectStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { deriveBOQ, boqToSelectedItems } from '../../lib/blueprintBOQ';
import { calculateAutoAssumptions } from '../../lib/pricingEngine';
import type { Client, Property } from '../../types';
import { Button, Alert } from '../ui';

interface Props {
  onClose: () => void;
}

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'דירה' },
  { value: 'house', label: 'בית פרטי' },
  { value: 'office', label: 'משרד' },
  { value: 'shop', label: 'חנות' },
  { value: 'warehouse', label: 'מחסן' },
];

const CONDITIONS = [
  { value: 'maintained', label: 'שמור' },
  { value: 'new', label: 'חדש' },
  { value: 'old', label: 'ישן' },
  { value: 'heavy_renovation', label: 'שיפוץ כבד' },
];

const FINISHES = [
  { value: 'standard', label: 'סטנדרט' },
  { value: 'basic', label: 'בסיסית' },
  { value: 'premium', label: 'פרימיום' },
  { value: 'luxury', label: 'יוקרה' },
];

function detectRoomCounts(rooms: { name: string }[]) {
  let bathrooms = 0, kitchens = 0, balconies = 0;
  for (const r of rooms) {
    const n = r.name.toLowerCase();
    if (n.includes('רחצה') || n.includes('אמבט') || n.includes('מקלחת')) bathrooms++;
    else if (n.includes('מטבח')) kitchens++;
    else if (n.includes('מרפסת')) balconies++;
  }
  return { bathrooms, kitchens: Math.max(kitchens, 1), balconies };
}

export default function CreateProjectFromBlueprintModal({ onClose }: Props) {
  const navigate = useNavigate();
  const { rooms, annotations, calibration, setLinkedProject, setBlueprintName } = useBlueprintStore();
  const { createProject } = useProjectStore();
  const { pricing } = useSettingsStore();

  const totalSqmFromBlueprint = calibration.pixelsPerMeter
    ? parseFloat(rooms.reduce((s, r) => s + r.calculatedSqm, 0).toFixed(1))
    : 0;
  const { bathrooms: autoBathrooms, kitchens: autoKitchens, balconies: autoBalconies } = detectRoomCounts(rooms);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [propertyType, setPropertyType] = useState<string>('apartment');
  const [condition, setCondition] = useState<string>('maintained');
  const [finishLevel, setFinishLevel] = useState<string>('standard');
  const [totalSqm, setTotalSqm] = useState(totalSqmFromBlueprint);
  const [roomCount, setRoomCount] = useState(Math.max(rooms.length - autoBathrooms - autoKitchens - autoBalconies, 1));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const boqLines = deriveBOQ(rooms, annotations, calibration, pricing.itemPrices);
  const { items: blueprintItems, warnings } = boqToSelectedItems(boqLines, pricing.itemPrices);

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) errs.name = 'שם חובה (לפחות 2 תווים)';
    if (!phone.trim() || !/^0[2-9]\d{7,8}$/.test(phone.trim())) errs.phone = 'מספר טלפון ישראלי לא תקין';
    if (!address.trim() || address.trim().length < 2) errs.address = 'כתובת חובה';
    if (!city.trim()) errs.city = 'עיר חובה';
    if (!totalSqm || totalSqm <= 0) errs.totalSqm = 'חובה להזין שטח חיובי';
    if (!roomCount || roomCount < 1) errs.roomCount = 'לפחות חדר אחד';
    return errs;
  }

  async function handleCreate() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);

    const client: Client = { name: name.trim(), phone: phone.trim(), address: address.trim(), city: city.trim() };
    const property: Property = {
      type: propertyType as Property['type'],
      totalSqm,
      rooms: roomCount,
      bathrooms: autoBathrooms || 1,
      toilets: 1,
      kitchens: autoKitchens,
      balconies: autoBalconies,
      ceilingHeight: 2.7,
      hasElevator: false,
      hasParking: false,
      condition: condition as Property['condition'],
      finishLevel: finishLevel as Property['finishLevel'],
    };

    const autoOverrides = calculateAutoAssumptions(property);
    const project = createProject(client, property, blueprintItems, autoOverrides, 'נוצר מתוכנית בנייה');
    setLinkedProject(project.id);
    setBlueprintName(`תוכנית - ${client.name}`);
    navigate(`/project/${project.id}/estimate`);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">צור פרויקט מהתוכנית</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {blueprintItems.length} פריטי עבודה יועברו להצעת המחיר
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Warnings */}
          {warnings.length > 0 && (
            <Alert variant="warning" icon={<AlertTriangle size={14} />}>
              {warnings.length} סימונים לא תורגמו למחירון
            </Alert>
          )}
          {blueprintItems.length === 0 && (
            <Alert variant="warning" icon={<AlertTriangle size={14} />}>
              לא נמצאו כמויות בתוכנית. ניתן ליצור פרויקט ולהוסיף עבודות ידנית.
            </Alert>
          )}

          {/* Client info */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">פרטי לקוח</p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="label">שם לקוח *</label>
                <input className={`input ${errors.name ? 'border-red-400' : ''}`} value={name} onChange={e => setName(e.target.value)} placeholder="ישראל ישראלי" />
                {errors.name && <p className="error-msg">{errors.name}</p>}
              </div>
              <div>
                <label className="label">טלפון *</label>
                <input className={`input ${errors.phone ? 'border-red-400' : ''}`} value={phone} onChange={e => setPhone(e.target.value)} placeholder="0501234567" type="tel" />
                {errors.phone && <p className="error-msg">{errors.phone}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">כתובת *</label>
                  <input className={`input ${errors.address ? 'border-red-400' : ''}`} value={address} onChange={e => setAddress(e.target.value)} placeholder="רחוב הרצל 1" />
                  {errors.address && <p className="error-msg">{errors.address}</p>}
                </div>
                <div>
                  <label className="label">עיר *</label>
                  <input className={`input ${errors.city ? 'border-red-400' : ''}`} value={city} onChange={e => setCity(e.target.value)} placeholder="תל אביב" />
                  {errors.city && <p className="error-msg">{errors.city}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Property */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">פרטי נכס</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">
                  שטח כללי *
                  {!calibration.pixelsPerMeter && <span className="text-amber-500 mr-1">(ללא כיול)</span>}
                </label>
                <div className="relative">
                  <input
                    type="number" min={1}
                    className={`input pl-10 ${errors.totalSqm ? 'border-red-400' : ''}`}
                    value={totalSqm || ''}
                    onChange={e => setTotalSqm(parseFloat(e.target.value) || 0)}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">מ"ר</span>
                </div>
                {errors.totalSqm && <p className="error-msg">{errors.totalSqm}</p>}
              </div>
              <div>
                <label className="label">חדרים *</label>
                <input
                  type="number" min={1}
                  className={`input ${errors.roomCount ? 'border-red-400' : ''}`}
                  value={roomCount || ''}
                  onChange={e => setRoomCount(parseInt(e.target.value) || 0)}
                />
                {errors.roomCount && <p className="error-msg">{errors.roomCount}</p>}
              </div>
            </div>

            {/* Type */}
            <div className="mb-3">
              <label className="label">סוג נכס</label>
              <div className="flex flex-wrap gap-1.5">
                {PROPERTY_TYPES.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setPropertyType(t.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all
                      ${propertyType === t.value ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}
                  >{t.label}</button>
                ))}
              </div>
            </div>

            {/* Condition */}
            <div className="mb-3">
              <label className="label">מצב נכס</label>
              <div className="flex flex-wrap gap-1.5">
                {CONDITIONS.map(c => (
                  <button key={c.value} type="button"
                    onClick={() => setCondition(c.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all
                      ${condition === c.value ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >{c.label}</button>
                ))}
              </div>
            </div>

            {/* Finish */}
            <div>
              <label className="label">רמת גמר</label>
              <div className="flex flex-wrap gap-1.5">
                {FINISHES.map(f => (
                  <button key={f.value} type="button"
                    onClick={() => setFinishLevel(f.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all
                      ${finishLevel === f.value ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >{f.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 gap-3">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button size="lg" onClick={handleCreate} loading={saving}>
            צור פרויקט והצעת מחיר
          </Button>
        </div>
      </div>
    </div>
  );
}
