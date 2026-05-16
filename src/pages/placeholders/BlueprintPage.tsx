import { Map, Upload, Ruler, Layers, Cpu } from 'lucide-react';
import { Button, Card, CardBody, Alert } from '../../components/ui';

export default function BlueprintPage() {
  return (
    <div className="page-container">
      <h1 className="page-title mb-1">תוכניות בנייה</h1>
      <p className="page-subtitle">ייבוא ועבודה עם תוכניות, שרטוטים ותצלומי-אוויר</p>

      <Alert variant="info" className="mb-6">
        <strong>Phase 3 — בקרוב:</strong> מודול תוכניות בנייה עם canvas interactif, מדידת שטחים ויצירת כתב כמויות אוטומטי.
      </Alert>

      {/* Upload zone placeholder */}
      <Card className="mb-5">
        <CardBody>
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Map size={32} className="text-blue-400" />
            </div>
            <div>
              <p className="font-bold text-slate-800">העלה תוכנית בנייה</p>
              <p className="text-sm text-gray-400 mt-1">PDF, DWG, PNG, JPG</p>
            </div>
            <Button variant="outline" disabled>
              <Upload size={18} />
              בחר קובץ
            </Button>
            <p className="text-xs text-gray-300">זמין בגרסה הבאה</p>
          </div>
        </CardBody>
      </Card>

      {/* Features roadmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            icon: <Ruler size={24} className="text-blue-400" />,
            bg: 'bg-blue-50',
            title: 'מדידת שטחים',
            desc: 'ציור פולגון על התוכנית ומדידה אוטומטית של שטח כל חדר',
            phase: 'Phase 3',
          },
          {
            icon: <Layers size={24} className="text-green-400" />,
            bg: 'bg-green-50',
            title: 'סימון על התוכנית',
            desc: 'סמן קירות הריסה, נקודות חשמל, מים, מזגנים וחלונות',
            phase: 'Phase 3',
          },
          {
            icon: <Cpu size={24} className="text-amber-400" />,
            bg: 'bg-amber-50',
            title: 'AI מתוכנית',
            desc: 'זיהוי חדרים, קירות ופתחים מתוך תוכנית אוטומטי',
            phase: 'Phase 4',
          },
          {
            icon: <Map size={24} className="text-purple-400" />,
            bg: 'bg-purple-50',
            title: 'קנה מידה',
            desc: 'הגדרת קנה מידה ומדידות מדויקות לפי מ"ר אמיתיים',
            phase: 'Phase 3',
          },
        ].map((item, i) => (
          <Card key={i} className="p-5 flex gap-4 items-start">
            <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
              {item.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-slate-800">{item.title}</p>
                <span className="badge badge-gray text-xs">{item.phase}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Future data types note */}
      <Card className="mt-5 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          טיפוסי נתונים מוכנים לשלב הבא
        </p>
        <div className="space-y-1 text-sm font-mono text-gray-500">
          <div>BlueprintFile ✓</div>
          <div>BlueprintRoom ✓</div>
          <div>BlueprintAnnotation ✓</div>
          <div className="text-xs text-gray-300 mt-2">
            (מוגדרים ב-src/types/index.ts, ממתינים לממשק)
          </div>
        </div>
      </Card>
    </div>
  );
}
