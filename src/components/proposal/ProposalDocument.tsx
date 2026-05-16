import { Project, EstimateVersion, CompanySettings } from '../../types';
import {
  formatCurrency, formatDate, UNIT_LABELS,
  CONDITION_LABELS, FINISH_LABELS, PROPERTY_TYPE_LABELS,
} from '../../lib/format';
import { WORK_CATEGORIES, findWorkItem } from '../../data/workCategories';

interface Props {
  project: Project;
  version: EstimateVersion;
  company: CompanySettings;
  proposalNumber: string;
}

export function ProposalDocument({ project, version, company, proposalNumber }: Props) {
  const r = version.result;

  const categorized = WORK_CATEGORIES.map((cat) => {
    const items = version.selectedItems.filter((s) => s.categoryId === cat.id);
    return { ...cat, selectedItems: items };
  }).filter((c) => c.selectedItems.length > 0);

  return (
    <div className="proposal-doc max-w-4xl mx-auto px-4 py-8 md:px-8 bg-white" dir="rtl">

      {/* Company header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8 pb-6 border-b-2 border-slate-200">
        <div>
          {company.logoBase64 && (
            <img src={company.logoBase64} alt="לוגו" className="h-14 object-contain mb-3" />
          )}
          <div className="text-xl font-extrabold text-slate-900">
            {company.companyName || 'שם החברה'}
          </div>
          {company.contactName && <div className="text-sm text-gray-600 mt-0.5">{company.contactName}</div>}
          <div className="text-sm text-gray-500 mt-1 space-y-0.5">
            {company.phone && <div>{company.phone}</div>}
            {company.email && <div>{company.email}</div>}
            {company.address && <div>{company.address}</div>}
            {company.taxId && <div>עוסק מורשה מס׳ {company.taxId}</div>}
          </div>
        </div>
        <div className="text-left">
          <div className="text-3xl font-black text-slate-900 mb-1">הצעת מחיר</div>
          <div className="text-sm text-gray-500">מס׳ {proposalNumber}</div>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-6">
              <span className="text-gray-500">תאריך:</span>
              <span className="font-semibold">{formatDate(project.createdAt)}</span>
            </div>
            {project.expiresAt && (
              <div className="flex justify-between gap-6">
                <span className="text-gray-500">תוקף עד:</span>
                <span className="font-semibold">{formatDate(project.expiresAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Client + project details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase mb-2">הצעת מחיר מוגשת עבור</div>
          <div className="font-bold text-slate-900 text-base">{project.client.name}</div>
          {(project.client.address || project.client.city) && (
            <div className="text-sm text-gray-600 mt-0.5">
              {project.client.address}{project.client.city ? `, ${project.client.city}` : ''}
            </div>
          )}
          {project.client.phone && <div className="text-sm text-gray-600">{project.client.phone}</div>}
          {project.client.email && <div className="text-sm text-gray-600">{project.client.email}</div>}
        </div>
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase mb-2">פרטי הפרויקט</div>
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-gray">{PROPERTY_TYPE_LABELS[project.property.type]}</span>
            <span className="badge badge-gray">{project.property.totalSqm} מ"ר</span>
            <span className="badge badge-gray">{project.property.rooms} חדרים</span>
            <span className="badge badge-gray">{CONDITION_LABELS[project.property.condition]}</span>
            <span className="badge badge-gray">גמר {FINISH_LABELS[project.property.finishLevel]}</span>
          </div>
        </div>
      </div>

      {/* Work items table */}
      <div className="mb-8">
        <div className="text-sm font-bold text-gray-400 uppercase mb-3">פירוט עבודות</div>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-right px-4 py-2.5 font-semibold">פריט עבודה</th>
                <th className="text-center px-3 py-2.5 font-semibold w-20">כמות</th>
                <th className="text-center px-3 py-2.5 font-semibold w-20">יחידה</th>
                <th className="text-left px-4 py-2.5 font-semibold w-28">מחיר יחידה</th>
                <th className="text-left px-4 py-2.5 font-semibold w-28">סה"כ</th>
              </tr>
            </thead>
            <tbody>
              {categorized.map((cat, ci) => {
                const catTotal = cat.selectedItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
                return [
                  <tr key={`cat-${cat.id}`} className={ci % 2 === 0 ? 'bg-slate-50' : 'bg-gray-50'}>
                    <td colSpan={4} className="px-4 py-2 font-bold text-slate-700 text-xs uppercase">{cat.name}</td>
                    <td className="px-4 py-2 font-bold text-slate-800 text-left">{formatCurrency(catTotal)}</td>
                  </tr>,
                  ...cat.selectedItems.map((sel) => {
                    const def = findWorkItem(sel.itemId);
                    return (
                      <tr key={sel.itemId} className="border-t border-gray-100">
                        <td className="px-4 py-2.5 text-slate-700">
                          {def?.name ?? sel.itemId}
                          {sel.notes && <div className="text-xs text-gray-400">{sel.notes}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-center text-slate-600">{sel.quantity}</td>
                        <td className="px-3 py-2.5 text-center text-gray-500">{UNIT_LABELS[sel.unit]}</td>
                        <td className="px-4 py-2.5 text-left text-slate-600">{formatCurrency(sel.unitPrice)}</td>
                        <td className="px-4 py-2.5 text-left font-semibold text-slate-800">
                          {formatCurrency(sel.quantity * sel.unitPrice)}
                        </td>
                      </tr>
                    );
                  }),
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial summary */}
      <div className="mb-8">
        <div className="text-sm font-bold text-gray-400 uppercase mb-3">סיכום כספי</div>
        <div className="border border-gray-200 rounded-xl overflow-hidden max-w-sm mr-auto">
          <div className="divide-y divide-gray-100">
            <div className="flex justify-between px-5 py-3 text-sm">
              <span className="text-gray-600">סכום עבודות</span>
              <span className="font-semibold text-slate-800">{formatCurrency(r.rawSubtotal)}</span>
            </div>
            {r.difficultyAddition > 0 && (
              <div className="flex justify-between px-5 py-3 text-sm">
                <span className="text-gray-600">התאמת נכס ({CONDITION_LABELS[project.property.condition]})</span>
                <span className="font-semibold text-slate-800">+{formatCurrency(r.difficultyAddition + r.finishAddition)}</span>
              </div>
            )}
            {r.contingencyAmount > 0 && (
              <div className="flex justify-between px-5 py-3 text-sm">
                <span className="text-gray-600">הוצאות בלתי צפויות</span>
                <span className="font-semibold text-slate-800">+{formatCurrency(r.contingencyAmount)}</span>
              </div>
            )}
            <div className="flex justify-between px-5 py-3 text-sm bg-slate-50">
              <span className="font-bold text-slate-800">לפני מע"מ</span>
              <span className="font-bold text-slate-800">{formatCurrency(r.beforeVAT)}</span>
            </div>
            <div className="flex justify-between px-5 py-3 text-sm">
              <span className="text-gray-600">
                {r.vatPercent > 0 ? `מע"מ ${r.vatPercent}%` : 'מע"מ (פטור)'}
              </span>
              <span className="font-semibold text-slate-800">{formatCurrency(r.vatAmount)}</span>
            </div>
            <div className="flex justify-between px-5 py-4" style={{ background: '#0f1b2d' }}>
              <span className="text-white font-bold">סה"כ לתשלום</span>
              <span className="text-amber-400 font-black text-xl">{formatCurrency(r.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment terms */}
      {company.paymentTerms && company.paymentTerms.length > 0 && (
        <div className="mb-8">
          <div className="text-sm font-bold text-gray-400 uppercase mb-3">תנאי תשלום</div>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {company.paymentTerms.map((term, i) => {
              const match = term.match(/(\d+)%/);
              const pct = match ? parseInt(match[1], 10) : null;
              const amount = pct !== null ? (r.total * pct) / 100 : null;
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 last:border-b-0">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
                    {i + 1}
                  </div>
                  <span className="flex-1 text-sm text-slate-700">{term}</span>
                  {amount !== null && (
                    <span className="font-bold text-slate-900 text-sm">{formatCurrency(amount)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Warranty & exclusions */}
      <div className="mb-10">
        <div className="text-sm font-bold text-gray-400 uppercase mb-3">הערות וסייגים</div>
        <div className="border border-gray-200 rounded-xl p-5 text-sm text-gray-600 space-y-2">
          <p>• הצעת מחיר זו תקפה עד {project.expiresAt ? formatDate(project.expiresAt) : '30 יום'} ממועד הוצאתה.</p>
          <p>• האמור בהצעה זו אינו כולל עבודות שאינן מפורטות במסמך זה.</p>
          <p>• מחירים אינם כוללים אגרות, היתרים ותשלומי עירייה אלא אם צוין אחרת.</p>
          <p>• כל שינוי בהיקף העבודה יתומחר בנפרד בהסכמת שני הצדדים.</p>
          {r.estimatedLaborDays > 0 && (
            <p>• זמן ביצוע משוער: {r.estimatedLaborDays} ימי עבודה (בכפוף לתנאי שטח ואספקת חומרים).</p>
          )}
        </div>
      </div>

      {/* Signature area */}
      <div className="border-t-2 border-slate-200 pt-8 mb-4">
        <div className="text-sm font-bold text-gray-400 uppercase mb-6">חתימות</div>
        <div className="grid grid-cols-2 gap-12">
          <div>
            <div className="h-16 border-b-2 border-slate-800 mb-2" />
            <div className="text-sm font-semibold text-slate-700">חתימת הלקוח</div>
            <div className="text-xs text-gray-400 mt-1">שם: {project.client.name}</div>
            <div className="text-xs text-gray-400">תאריך: ________________</div>
          </div>
          <div>
            <div className="h-16 border-b-2 border-slate-800 mb-2" />
            <div className="text-sm font-semibold text-slate-700">חתימת הקבלן</div>
            <div className="text-xs text-gray-400 mt-1">שם: {company.contactName || company.companyName}</div>
            <div className="text-xs text-gray-400">תאריך: ________________</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 pt-6 border-t border-gray-100">
        {company.companyName} · {company.phone} · {company.email}
      </div>
    </div>
  );
}
