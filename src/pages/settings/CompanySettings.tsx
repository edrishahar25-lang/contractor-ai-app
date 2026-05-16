import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { Button, Card, CardHeader, CardBody, Alert, Toggle } from '../../components/ui';

const israeliPhone = z
  .string()
  .min(1, 'טלפון חובה')
  .regex(/^0[2-9]\d{7,8}$/, 'טלפון לא תקין (לדוגמה: 0501234567)');

const schema = z.object({
  companyName: z.string().min(2, 'שם החברה חובה'),
  contactName: z.string().min(2, 'שם איש הקשר חובה'),
  phone: israeliPhone,
  email: z.union([z.literal(''), z.string().email('אימייל לא תקין')]).optional(),
  address: z.string().min(2, 'כתובת חובה'),
  taxId: z.string().min(8, 'מספר עוסק לא תקין (לפחות 8 ספרות)').max(15),
  paymentTermsRaw: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CompanySettings() {
  const { company, setCompany } = useSettingsStore();
  const [saved, setSaved] = useState(false);
  const [vatExempt, setVatExempt] = useState(company.vatStatus === 'exempt');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: company.companyName,
      contactName: company.contactName,
      phone: company.phone,
      email: company.email,
      address: company.address,
      taxId: company.taxId,
      paymentTermsRaw: company.paymentTerms?.join('\n') ?? '',
    },
  });

  function onSubmit(data: FormValues) {
    setCompany({
      ...company,
      companyName: data.companyName,
      contactName: data.contactName,
      phone: data.phone,
      email: data.email ?? '',
      address: data.address,
      taxId: data.taxId,
      vatStatus: vatExempt ? 'exempt' : 'authorized',
      paymentTerms: (data.paymentTermsRaw ?? '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="page-container">
      <h1 className="page-title mb-1">הגדרות חברה</h1>
      <p className="page-subtitle">פרטי החברה יופיעו בהצעות המחיר</p>

      {saved && (
        <Alert variant="success" icon={<CheckCircle size={16} />} className="mb-4">
          ההגדרות נשמרו בהצלחה!
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <span className="font-bold text-slate-800">פרטי החברה</span>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">שם החברה *</label>
                  <input {...register('companyName')} className={`input ${errors.companyName ? 'input-error' : ''}`} placeholder="חברת הבנייה שלי בע״מ" />
                  {errors.companyName && <p className="error-msg">{errors.companyName.message}</p>}
                </div>

                <div className="form-group">
                  <label className="label">שם איש קשר *</label>
                  <input {...register('contactName')} className={`input ${errors.contactName ? 'input-error' : ''}`} placeholder="ישראל ישראלי" />
                  {errors.contactName && <p className="error-msg">{errors.contactName.message}</p>}
                </div>

                <div className="form-group">
                  <label className="label">טלפון *</label>
                  <input {...register('phone')} className={`input ${errors.phone ? 'input-error' : ''}`} placeholder="050-0000000" type="tel" />
                  {errors.phone && <p className="error-msg">{errors.phone.message}</p>}
                </div>

                <div className="form-group">
                  <label className="label">אימייל <span className="text-gray-400 text-xs font-normal">(אופציונלי)</span></label>
                  <input {...register('email')} className={`input ${errors.email ? 'input-error' : ''}`} placeholder="office@company.co.il" type="email" />
                  {errors.email && <p className="error-msg">{errors.email.message}</p>}
                </div>

                <div className="form-group sm:col-span-2">
                  <label className="label">כתובת *</label>
                  <input {...register('address')} className={`input ${errors.address ? 'input-error' : ''}`} placeholder="רחוב הבנייה 5, תל אביב" />
                  {errors.address && <p className="error-msg">{errors.address.message}</p>}
                </div>

                <div className="form-group">
                  <label className="label">מספר עוסק מורשה *</label>
                  <input {...register('taxId')} className={`input ${errors.taxId ? 'input-error' : ''}`} placeholder="012345678" inputMode="numeric" />
                  {errors.taxId && <p className="error-msg">{errors.taxId.message}</p>}
                </div>

                <div className="form-group flex justify-start items-end">
                  <Toggle
                    checked={vatExempt}
                    onChange={setVatExempt}
                    label="עוסק פטור (ללא מע״מ)"
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <span className="font-bold text-slate-800">תנאי תשלום</span>
            </CardHeader>
            <CardBody>
              <div className="form-group">
                <label className="label">אבני דרך לתשלום <span className="text-gray-400 text-xs font-normal">(שורה אחת לכל אבן דרך)</span></label>
                <textarea
                  {...register('paymentTermsRaw')}
                  className="input min-h-[100px]"
                  placeholder={'30% מקדמה\n40% במהלך העבודה\n30% בסיום העבודה'}
                />
              </div>
            </CardBody>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg">
              <Save size={18} />
              שמור הגדרות
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
