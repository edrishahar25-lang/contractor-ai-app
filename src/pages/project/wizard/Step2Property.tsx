import { useFormContext } from 'react-hook-form';
import { WizardFormValues } from '../NewProject';
import { Toggle } from '../../../components/ui';

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'דירה' },
  { value: 'house', label: 'בית פרטי' },
  { value: 'office', label: 'משרד' },
  { value: 'shop', label: 'חנות' },
  { value: 'warehouse', label: 'מחסן' },
];

const CONDITIONS = [
  { value: 'new', label: 'חדש', color: 'text-green-700 border-green-300 bg-green-50', active: 'border-green-500 bg-green-100' },
  { value: 'maintained', label: 'שמור', color: 'text-blue-700 border-blue-200 bg-blue-50', active: 'border-blue-500 bg-blue-100' },
  { value: 'old', label: 'ישן', color: 'text-amber-700 border-amber-200 bg-amber-50', active: 'border-amber-500 bg-amber-100' },
  { value: 'heavy_renovation', label: 'דורש שיפוץ כבד', color: 'text-red-700 border-red-200 bg-red-50', active: 'border-red-500 bg-red-100' },
];

const FINISHES = [
  { value: 'basic', label: 'בסיסית', mult: '×0.9', color: 'text-gray-700 border-gray-200', active: 'border-gray-500 bg-gray-50' },
  { value: 'standard', label: 'סטנדרט', mult: '×1.0', color: 'text-blue-700 border-blue-200', active: 'border-blue-500 bg-blue-100' },
  { value: 'premium', label: 'פרימיום', mult: '×1.25', color: 'text-amber-700 border-amber-200', active: 'border-amber-500 bg-amber-100' },
  { value: 'luxury', label: 'יוקרה', mult: '×1.6', color: 'text-purple-700 border-purple-200', active: 'border-purple-500 bg-purple-100' },
];

export default function Step2Property() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<WizardFormValues>();

  const condition = watch('property.condition');
  const finishLevel = watch('property.finishLevel');
  const hasElevator = watch('property.hasElevator');
  const hasParking = watch('property.hasParking');

  function getFieldError(name: string): string | undefined {
    const parts = name.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: any = errors;
    for (const part of parts) {
      if (!obj) return undefined;
      obj = obj[part];
    }
    return obj?.message;
  }

  const numInput = (name: string, label: string, unit?: string) => {
    const errMsg = getFieldError(name);
    return (
      <div className="form-group">
        <label className="label">{label}</label>
        <div className="relative">
          <input
            {...register(name as never, { valueAsNumber: true })}
            type="number"
            inputMode="numeric"
            min={0}
            step={name.includes('ceilingHeight') ? 0.1 : 1}
            className={`input ${unit ? 'pl-12' : ''} ${errMsg ? 'border-red-400 focus:border-red-500' : ''}`}
            placeholder="0"
          />
          {unit && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
              {unit}
            </span>
          )}
        </div>
        {errMsg && <p className="error-msg mt-1">{errMsg}</p>}
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-900 mb-1">פרטי הנכס</h2>
      <p className="text-sm text-gray-500 mb-5">נתוני הנכס משפיעים ישירות על חישוב ההצעה</p>

      {/* Type */}
      <div className="form-group mb-5">
        <label className="label">סוג נכס</label>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setValue('property.type', t.value as never)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                ${watch('property.type') === t.value
                  ? 'border-amber-500 bg-amber-50 text-amber-800'
                  : 'border-gray-200 text-gray-600 hover:border-amber-300'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Measurements */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        {numInput('property.totalSqm', 'שטח כללי *', 'מ"ר')}
        {numInput('property.rooms', 'חדרים *')}
        {numInput('property.bathrooms', 'חדרי רחצה')}
        {numInput('property.toilets', 'שירותים')}
        {numInput('property.kitchens', 'מטבחים')}
        {numInput('property.balconies', 'מרפסות')}
        {numInput('property.ceilingHeight', 'גובה תקרה', "מ'")}
        {numInput('property.floor', 'קומה')}
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-6 mb-6">
        <Toggle
          checked={hasElevator}
          onChange={(v) => setValue('property.hasElevator', v)}
          label="מעלית"
        />
        <Toggle
          checked={hasParking}
          onChange={(v) => setValue('property.hasParking', v)}
          label="חניה לפריקה"
        />
      </div>

      <div className="divider" />

      {/* Condition */}
      <div className="form-group mb-5">
        <label className="label mb-2">מצב הנכס</label>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setValue('property.condition', c.value as never)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                ${condition === c.value ? c.active : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Finish */}
      <div className="form-group mb-4">
        <label className="label mb-2">רמת גמר מבוקשת</label>
        <div className="flex flex-wrap gap-2">
          {FINISHES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setValue('property.finishLevel', f.value as never)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                ${finishLevel === f.value ? f.active : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              {f.label}
              <span className="mr-1.5 text-xs opacity-60">{f.mult}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Multiplier preview */}
      {condition && finishLevel && (
        <div className="flex flex-wrap gap-4 mt-4 p-4 bg-slate-900 rounded-2xl">
          {[
            {
              label: 'מכפיל מצב',
              value: ({ new: 1.0, maintained: 1.05, old: 1.15, heavy_renovation: 1.3 } as Record<string, number>)[condition],
            },
            {
              label: 'מכפיל גמר',
              value: ({ basic: 0.9, standard: 1.0, premium: 1.25, luxury: 1.6 } as Record<string, number>)[finishLevel],
            },
          ].map((m) => (
            <div key={m.label}>
              <div className="text-xs text-white/40 mb-0.5">{m.label}</div>
              <div className="text-2xl font-extrabold text-amber-400">×{m.value?.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
