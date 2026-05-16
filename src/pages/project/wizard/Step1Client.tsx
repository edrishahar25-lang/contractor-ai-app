import { useFormContext } from 'react-hook-form';
import { WizardFormValues } from '../NewProject';

export default function Step1Client() {
  const {
    register,
    formState: { errors },
  } = useFormContext<WizardFormValues>();

  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-900 mb-1">פרטי לקוח</h2>
      <p className="text-sm text-gray-500 mb-5">מידע על הלקוח — ישמש בהצעת המחיר</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* שם */}
        <div className="form-group">
          <label className="label">שם לקוח *</label>
          <input
            {...register('client.name')}
            className={`input ${errors.client?.name ? 'input-error' : ''}`}
            placeholder="ישראל ישראלי"
            autoComplete="name"
          />
          {errors.client?.name && (
            <p className="error-msg">{errors.client.name.message}</p>
          )}
        </div>

        {/* טלפון */}
        <div className="form-group">
          <label className="label">טלפון *</label>
          <input
            {...register('client.phone')}
            className={`input ${errors.client?.phone ? 'input-error' : ''}`}
            placeholder="050-0000000"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />
          {errors.client?.phone && (
            <p className="error-msg">{errors.client.phone.message}</p>
          )}
        </div>

        {/* כתובת */}
        <div className="form-group sm:col-span-2">
          <label className="label">כתובת *</label>
          <input
            {...register('client.address')}
            className={`input ${errors.client?.address ? 'input-error' : ''}`}
            placeholder="רחוב הרצל 1"
            autoComplete="street-address"
          />
          {errors.client?.address && (
            <p className="error-msg">{errors.client.address.message}</p>
          )}
        </div>

        {/* עיר */}
        <div className="form-group">
          <label className="label">עיר *</label>
          <input
            {...register('client.city')}
            className={`input ${errors.client?.city ? 'input-error' : ''}`}
            placeholder="תל אביב"
            autoComplete="address-level2"
          />
          {errors.client?.city && (
            <p className="error-msg">{errors.client.city.message}</p>
          )}
        </div>

        {/* אימייל */}
        <div className="form-group">
          <label className="label">
            אימייל <span className="text-gray-400 font-normal text-xs">(אופציונלי)</span>
          </label>
          <input
            {...register('client.email')}
            className={`input ${errors.client?.email ? 'input-error' : ''}`}
            placeholder="email@example.com"
            type="email"
            autoComplete="email"
          />
          {errors.client?.email && (
            <p className="error-msg">{errors.client.email.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
