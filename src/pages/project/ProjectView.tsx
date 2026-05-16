import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  FileText,
  MessageCircle,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_BADGE_CLASS, isExpired, PROPERTY_TYPE_LABELS, CONDITION_LABELS, FINISH_LABELS } from '../../lib/format';
import { openWhatsApp } from '../../lib/whatsapp';
import { Button, Card, CardHeader, CardBody, Badge, Alert } from '../../components/ui';
import { ProjectStatus } from '../../types';

const ALLOWED_STATUS: ProjectStatus[] = ['draft', 'sent', 'signed', 'rejected', 'in_progress', 'completed'];

export default function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, getCurrentVersion, setStatus, createNewVersion } = useProjectStore();
  const { company } = useSettingsStore();
  const [creatingVersion, setCreatingVersion] = useState(false);

  const project = id ? getProject(id) : undefined;
  const version = id ? getCurrentVersion(id) : undefined;

  if (!project || !version || !id) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h3 className="text-xl font-bold">פרויקט לא נמצא</h3>
          <Button onClick={() => navigate('/projects')}>חזרה לרשימה</Button>
        </div>
      </div>
    );
  }

  const expired = isExpired(project.expiresAt);
  const canEditDirectly = project.status === 'draft';
  const needsNewVersion = ['sent', 'signed'].includes(project.status);

  function handleCreateVersion() {
    setCreatingVersion(true);
    try {
      createNewVersion(id!);
    } finally {
      setCreatingVersion(false);
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">{project.client.name}</h1>
            <p className="page-subtitle">
              {project.client.address}, {project.client.city}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={STATUS_BADGE_CLASS[project.status] + ' text-sm px-3 py-1.5'}>
            {STATUS_LABELS[project.status]}
          </span>
          <Badge variant="gray">v{version.versionNumber}</Badge>
        </div>
      </div>

      {/* Warnings */}
      {expired && !['signed', 'completed'].includes(project.status) && (
        <Alert variant="error" icon={<AlertTriangle size={16} />} className="mb-4">
          ההצעה פגה — עדכן מחירים לפני שליחה מחודשת.
        </Alert>
      )}
      {needsNewVersion && (
        <Alert variant="info" icon={<AlertTriangle size={16} />} className="mb-4">
          לא ניתן לערוך הצעה שנשלחה / נחתמה. ליצירת גרסה חדשה לחץ על "גרסה חדשה".
        </Alert>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Button
          onClick={() => navigate(`/project/${id}/estimate`)}
          size="lg"
        >
          <TrendingUp size={18} />
          הצג פירוט הצעה
        </Button>

        <Button
          variant="whatsapp"
          size="lg"
          onClick={() => openWhatsApp(project, version, company)}
        >
          <MessageCircle size={18} />
          שלח בוואטסאפ
        </Button>

        <Button
          variant="outline"
          onClick={() => alert('יצוא PDF יהיה זמין בגרסה הבאה.')}
        >
          <FileText size={16} />
          PDF
          <span className="badge badge-gray text-xs">בקרוב</span>
        </Button>

        {canEditDirectly && (
          <Button variant="outline" onClick={() => navigate('/project/new')}>
            עריכה
          </Button>
        )}

        {needsNewVersion && (
          <Button
            variant="secondary"
            loading={creatingVersion}
            onClick={handleCreateVersion}
          >
            <Plus size={16} />
            גרסה חדשה
          </Button>
        )}
      </div>

      {/* Status changer */}
      <div className="card mb-5">
        <CardHeader>
          <span className="font-semibold text-slate-800 text-sm">שנה סטטוס</span>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {ALLOWED_STATUS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(project.id, s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                  ${project.status === s
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'border-gray-200 text-gray-600 hover:border-slate-400'
                  }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </CardBody>
      </div>

      {/* Price summary */}
      <div
        className="rounded-2xl p-6 mb-5 text-center"
        style={{ background: 'linear-gradient(135deg, #0f1b2d 0%, #1a2d4a 100%)' }}
      >
        <div className="text-white/50 text-sm mb-1 font-medium">סה"כ הצעה כולל מע"מ</div>
        <div className="text-5xl font-black text-amber-400 leading-none mb-2">
          {formatCurrency(version.result.total)}
        </div>
        <div className="text-white/40 text-sm">
          {formatCurrency(version.result.beforeVAT)} לפני מע"מ
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <Card>
          <CardHeader>
            <span className="font-bold text-slate-800 text-sm">פרטי לקוח</span>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm">
              {[
                { l: 'שם', v: project.client.name },
                { l: 'טלפון', v: project.client.phone },
                { l: 'אימייל', v: project.client.email || '—' },
                { l: 'כתובת', v: `${project.client.address}, ${project.client.city}` },
              ].map((r) => (
                <div key={r.l} className="flex justify-between">
                  <span className="text-gray-400">{r.l}</span>
                  <span className="font-semibold text-slate-800">{r.v}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <span className="font-bold text-slate-800 text-sm">פרטי נכס</span>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm">
              {[
                { l: 'סוג', v: PROPERTY_TYPE_LABELS[project.property.type] },
                { l: 'שטח', v: `${project.property.totalSqm} מ"ר` },
                { l: 'חדרים', v: project.property.rooms },
                { l: 'מצב', v: CONDITION_LABELS[project.property.condition] },
                { l: 'גמר', v: FINISH_LABELS[project.property.finishLevel] },
              ].map((r) => (
                <div key={r.l} className="flex justify-between">
                  <span className="text-gray-400">{r.l}</span>
                  <span className="font-semibold text-slate-800">{r.v}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Version history */}
      {project.versions.length > 1 && (
        <Card className="mb-5">
          <CardHeader>
            <span className="font-bold text-slate-800 text-sm">היסטוריית גרסאות</span>
          </CardHeader>
          <div className="divide-y divide-gray-100">
            {[...project.versions].reverse().map((v) => {
              const isCurrent = v.id === project.currentVersionId;
              return (
                <div key={v.id} className={`flex items-center justify-between px-5 py-3.5 ${isCurrent ? 'bg-amber-50/40' : ''}`}>
                  <div className="flex items-center gap-3">
                    <Badge variant={isCurrent ? 'gold' : 'gray'}>v{v.versionNumber}</Badge>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {formatCurrency(v.result.total)}
                      </div>
                      <div className="text-xs text-gray-400">{formatDate(v.createdAt)}</div>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="text-xs text-amber-700 font-semibold">גרסה נוכחית</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Expiry & timing */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
                <Clock size={12} />
                תאריך יצירה
              </div>
              <div className="font-semibold text-slate-800 text-sm">
                {formatDate(project.createdAt)}
              </div>
            </div>
            {project.expiresAt && (
              <div>
                <div className={`flex items-center gap-1.5 text-xs mb-0.5 ${expired ? 'text-red-500' : 'text-gray-400'}`}>
                  {expired ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                  תוקף ההצעה
                </div>
                <div className={`font-semibold text-sm ${expired ? 'text-red-600' : 'text-slate-800'}`}>
                  {formatDate(project.expiresAt)}
                  {expired && ' (פג)'}
                </div>
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
                <Clock size={12} />
                ימי עבודה מוערכים
              </div>
              <div className="font-semibold text-slate-800 text-sm">
                {version.result.estimatedLaborDays} ימים
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
