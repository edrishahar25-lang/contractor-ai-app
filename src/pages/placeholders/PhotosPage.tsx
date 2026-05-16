import { Camera, Upload, Cpu, ImageIcon } from 'lucide-react';
import { Button, Card, CardBody, Alert } from '../../components/ui';

export default function PhotosPage() {
  return (
    <div className="page-container">
      <h1 className="page-title mb-1">תמונות נכס</h1>
      <p className="page-subtitle">צלם ועלה תמונות לפרויקט — יגביר את דיוק ההצעה</p>

      <Alert variant="info" className="mb-6">
        <strong>Phase 2 — בקרוב:</strong> מודול תמונות מלא עם ניתוח AI אוטומטי. הסרגל הזה שמור ומוכן לפיתוח.
      </Alert>

      {/* Upload zone placeholder */}
      <Card className="mb-5">
        <CardBody>
          <div
            className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center gap-4 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
              <ImageIcon size={32} className="text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-slate-800">גרור תמונות לכאן</p>
              <p className="text-sm text-gray-400 mt-1">או בחר מהגלריה / צלם</p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              <Button variant="primary" disabled>
                <Camera size={18} />
                צלם תמונה
              </Button>
              <Button variant="outline" disabled>
                <Upload size={18} />
                העלה תמונות
              </Button>
            </div>
            <p className="text-xs text-gray-300">זמין בגרסה הבאה</p>
          </div>
        </CardBody>
      </Card>

      {/* AI analysis placeholder */}
      <Card className="overflow-hidden">
        <div
          className="p-5 flex items-center gap-4 cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #0f1b2d 0%, #1a2d4a 100%)' }}
          onClick={() =>
            alert(
              'בגרסה הבאה המערכת תזהה קירות, ריצוף, נקודות חשמל, מצב צבע, רטיבות ונזקים מתוך התמונה.',
            )
          }
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Cpu size={24} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-white text-base">ניתוח AI לתמונה</div>
            <div className="text-sm text-white/50 mt-0.5">
              זיהוי אוטומטי של מצב נכס, חומרים קיימים ונזקים
            </div>
          </div>
          <span className="badge bg-amber-500/20 text-amber-400 text-xs">Phase 2</span>
        </div>

        <CardBody>
          <div className="space-y-3 text-sm text-gray-600">
            <p className="font-semibold text-slate-800">מה המערכת תזהה בגרסה הבאה:</p>
            <ul className="space-y-2 list-none">
              {[
                '🧱 סוג ומצב קירות וריצוף',
                '💡 מיקום ומצב נקודות חשמל',
                '🚿 מצב אינסטלציה וכלים סניטריים',
                '🎨 צבע, קלפים, רטיבות ועובש',
                '🪟 מצב חלונות ואלומיניום',
                '📐 מדידת שטחים ממגובה',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-base">{item.split(' ')[0]}</span>
                  <span>{item.split(' ').slice(1).join(' ')}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
