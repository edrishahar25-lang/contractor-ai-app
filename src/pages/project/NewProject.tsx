import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, ChevronRight, ChevronLeft, Save, AlertTriangle } from 'lucide-react';
import { Button, Alert } from '../../components/ui';
import { useProjectStore } from '../../stores/projectStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { storage } from '../../lib/storage';
import { debounce } from '../../lib/debounce';
import { calculateAutoAssumptions, calculateEstimate } from '../../lib/pricingEngine';
import { formatCurrency } from '../../lib/format';
import { AutoAssumptions, SelectedWorkItem, Property, Client } from '../../types';
import Step1Client from './wizard/Step1Client';
import Step2Property from './wizard/Step2Property';
import Step3Categories from './wizard/Step3Categories';
import Step4Assumptions from './wizard/Step4Assumptions';
import LiveEstimateSidebar from '../../components/LiveEstimateSidebar';

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const israeliPhone = z
  .string()
  .min(1, 'טלפון הוא שדה חובה')
  .regex(/^0[2-9]\d{7,8}$/, 'מספר טלפון ישראלי לא תקין (לדוגמה: 0501234567)');

const clientSchema = z.object({
  name: z.string().min(2, 'שם חובה (לפחות 2 תווים)'),
  phone: israeliPhone,
  email: z.union([z.literal(''), z.string().email('כתובת אימייל לא תקינה')]).optional(),
  address: z.string().min(2, 'כתובת חובה'),
  city: z.string().min(1, 'עיר חובה'),
});

const propertySchema = z.object({
  type: z.enum(['apartment', 'house', 'office', 'shop', 'warehouse']),
  totalSqm: z.number({ invalid_type_error: 'שדה חובה' }).positive('חובה להזין שטח חיובי'),
  rooms: z.number({ invalid_type_error: 'שדה חובה' }).min(1, 'לפחות חדר אחד'),
  bathrooms: z.number().min(0).default(0),
  toilets: z.number().min(0).default(0),
  kitchens: z.number().min(0).default(1),
  balconies: z.number().min(0).default(0),
  ceilingHeight: z.number().positive().default(2.7),
  floor: z.number().optional(),
  hasElevator: z.boolean().default(false),
  hasParking: z.boolean().default(false),
  condition: z.enum(['new', 'maintained', 'old', 'heavy_renovation']).default('maintained'),
  finishLevel: z.enum(['basic', 'standard', 'premium', 'luxury']).default('standard'),
});

export const wizardSchema = z.object({
  client: clientSchema,
  property: propertySchema,
});

export type WizardFormValues = z.infer<typeof wizardSchema>;

// ─── Steps config ────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'פרטי לקוח', shortLabel: 'לקוח' },
  { label: 'פרטי נכס', shortLabel: 'נכס' },
  { label: 'קטגוריות עבודה', shortLabel: 'עבודה' },
  { label: 'הנחות אוטומטיות', shortLabel: 'הנחות' },
];

const DEFAULT_FORM_VALUES: WizardFormValues = {
  client: { name: '', phone: '', email: '', address: '', city: '' },
  property: {
    type: 'apartment',
    totalSqm: 0,
    rooms: 0,
    bathrooms: 1,
    toilets: 1,
    kitchens: 1,
    balconies: 0,
    ceilingHeight: 2.7,
    hasElevator: false,
    hasParking: false,
    condition: 'maintained',
    finishLevel: 'standard',
  },
};

// ─── Draft type ───────────────────────────────────────────────────────────────

type WizardDraft = {
  formValues?: WizardFormValues;
  selectedItems?: SelectedWorkItem[];
  autoOverrides?: Partial<AutoAssumptions>;
  step?: number;
};

// ─── Component ───────────────────────────────────────────────────────────────

const DRAFT_KEY = storage.wizardDraftKey;

export default function NewProject() {
  const navigate = useNavigate();
  const { isCompanyConfigured, pricing, company } = useSettingsStore();
  const { createProject } = useProjectStore();

  // Load draft once via lazy initializer — never call setState during render
  const [draft] = useState<WizardDraft>(() => {
    try {
      return storage.load<WizardDraft>(DRAFT_KEY, {});
    } catch {
      return {};
    }
  });

  const [currentStep, setCurrentStep] = useState(draft.step ?? 0);
  const [selectedItems, setSelectedItems] = useState<SelectedWorkItem[]>(draft.selectedItems ?? []);
  const [autoOverrides, setAutoOverrides] = useState<Partial<AutoAssumptions>>(draft.autoOverrides ?? {});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const methods = useForm<WizardFormValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: draft.formValues ?? DEFAULT_FORM_VALUES,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const autosave = useCallback(
    debounce((values: WizardFormValues, items: SelectedWorkItem[], overrides: Partial<AutoAssumptions>, step: number) => {
      storage.save(DRAFT_KEY, { formValues: values, selectedItems: items, autoOverrides: overrides, step });
    }, 500),
    [],
  );

  const formValues = methods.watch();
  useEffect(() => {
    autosave(formValues, selectedItems, autoOverrides, currentStep);
  }, [formValues, selectedItems, autoOverrides, currentStep, autosave]);

  const property = methods.watch('property') as Property;
  const computed = calculateAutoAssumptions(property);
  const liveEstimate =
    selectedItems.length > 0 ? calculateEstimate(selectedItems, property, pricing, company) : null;

  // Guard: all hooks must run before any conditional return
  if (!isCompanyConfigured) {
    return (
      <div className="page-container">
        <div className="card card-body text-center py-12">
          <div className="text-4xl mb-4">
            <AlertTriangle className="inline text-amber-500" size={40} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">
            יש להשלים קודם את פרטי החברה
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            לא ניתן ליצור הצעת מחיר ללא פרטי חברה. מלא את השם, הטלפון ומספר עוסק.
          </p>
          <Button size="lg" className="mx-auto" onClick={() => navigate('/settings')}>
            עבור להגדרות
          </Button>
        </div>
      </div>
    );
  }

  // Step navigation
  const STEP_FIELDS: Record<number, (keyof WizardFormValues)[]> = {
    0: ['client'],
    1: ['property'],
    2: [],
    3: [],
  };

  async function handleNext() {
    const fieldsToValidate = STEP_FIELDS[currentStep];
    const valid = fieldsToValidate.length === 0
      ? true
      : await methods.trigger(fieldsToValidate as never);

    if (!valid) return;
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleFinish() {
    const valid = await methods.trigger();
    if (!valid) {
      setCurrentStep(0);
      return;
    }

    if (selectedItems.length === 0) {
      setSaveError('יש לבחור לפחות פריט עבודה אחד.');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const values = methods.getValues();
      const project = createProject(
        values.client as Client,
        values.property as Property,
        selectedItems,
        autoOverrides,
      );
      storage.remove(DRAFT_KEY);
      navigate(`/project/${project.id}`);
    } catch {
      setSaveError('שגיאה בשמירת הפרויקט. נסה שוב.');
      setSaving(false);
    }
  }

  return (
    <div className="page-container">
      <h1 className="page-title mb-1">פרויקט חדש</h1>
      <p className="page-subtitle">השלם את כל השלבים לקבלת הצעת מחיר מדויקת</p>

      {/* Progress steps */}
      <div className="flex items-center mb-6 overflow-x-auto pb-2">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-center flex-shrink-0">
            <div
              className={`step-dot ${
                i < currentStep
                  ? 'step-dot-completed'
                  : i === currentStep
                  ? 'step-dot-active'
                  : 'step-dot-pending'
              }`}
            >
              {i < currentStep ? <Check size={14} /> : i + 1}
            </div>
            <span
              className={`mr-1.5 text-xs font-semibold hidden sm:block ${
                i === currentStep ? 'text-slate-800' : 'text-gray-400'
              }`}
            >
              {step.shortLabel}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-2 flex-shrink-0 h-0.5 w-8 sm:w-12 ${
                  i < currentStep ? 'bg-green-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <FormProvider {...methods}>
        {currentStep === 0 && (
          <div className="card card-body mb-5"><Step1Client /></div>
        )}
        {currentStep === 1 && (
          <div className="card card-body mb-5"><Step2Property /></div>
        )}
        {currentStep === 2 && (
          <div className="flex gap-5 mb-5 items-start">
            {/* Categories (main, right side in RTL) */}
            <div className="flex-1 min-w-0">
              <Step3Categories selectedItems={selectedItems} onChange={setSelectedItems} />
            </div>
            {/* Estimate sidebar (desktop only, left side in RTL) */}
            <div className="hidden lg:block w-72 flex-shrink-0">
              <LiveEstimateSidebar selectedItems={selectedItems} property={property} />
            </div>
          </div>
        )}
        {currentStep === 3 && (
          <div className="card card-body mb-5">
            <Step4Assumptions
              property={property}
              computed={computed}
              overrides={autoOverrides}
              onOverride={(patch) => setAutoOverrides((prev) => ({ ...prev, ...patch }))}
              selectedItems={selectedItems}
            />
          </div>
        )}
      </FormProvider>

      {saveError && (
        <Alert variant="error" className="mb-4">
          {saveError}
        </Alert>
      )}

      {/* Mobile live summary — step 2 only */}
      {currentStep === 2 && selectedItems.length > 0 && (
        <div className="lg:hidden bg-slate-900 rounded-2xl px-4 py-3.5 mb-4 shadow-card-lg">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">
              {selectedItems.length} פריטים נבחרים
            </span>
            <span className="text-amber-500/60 text-[10px] font-semibold">עדכון חי</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-white/35 text-[9px] font-bold uppercase mb-0.5">עלות בסיסית</div>
              <div className="text-amber-400 font-bold text-sm leading-tight truncate">
                {formatCurrency(selectedItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0))}
              </div>
            </div>
            <div className="text-center border-x border-white/10">
              <div className="text-white/35 text-[9px] font-bold uppercase mb-0.5">לפני מע״מ</div>
              <div className="text-white font-bold text-sm leading-tight truncate">
                {liveEstimate ? formatCurrency(liveEstimate.beforeVAT) : '—'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-white/35 text-[9px] font-bold uppercase mb-0.5">כולל מע״מ</div>
              <div className="text-amber-400 font-black text-base leading-tight truncate">
                {liveEstimate ? formatCurrency(liveEstimate.total) : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ChevronRight size={18} />
          הקודם
        </Button>

        <div className="flex gap-2">
          {currentStep < STEPS.length - 1 ? (
            <Button size="lg" onClick={handleNext}>
              הבא
              <ChevronLeft size={18} />
            </Button>
          ) : (
            <Button size="lg" onClick={handleFinish} loading={saving}>
              <Save size={18} />
              צור הצעת מחיר
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
