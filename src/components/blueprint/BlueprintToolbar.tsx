import {
  MousePointer2, Hand, Ruler, Square, PenLine,
  Hammer, Minus, Zap, Droplets, Wind,
  Grid3x3, Paintbrush, ZoomIn, ZoomOut, Maximize2,
  ListChecks, Trash2, RotateCcw, Maximize,
  Lightbulb, DoorOpen, AppWindow,
} from 'lucide-react';
import type { BlueprintToolType } from '../../types/blueprint';
import type { BpCalibration } from '../../types/blueprint';

interface ToolDef {
  id: BlueprintToolType;
  label: string;
  icon: React.ReactNode;
  group: string;
}

const TOOLS: ToolDef[] = [
  { id: 'select',           label: 'בחירה',          icon: <MousePointer2 size={16} />, group: 'nav' },
  { id: 'pan',              label: 'גרירה',           icon: <Hand size={16} />,          group: 'nav' },
  { id: 'scale_calibrate',  label: 'כיול קנה מידה',   icon: <Ruler size={16} />,         group: 'calibrate' },
  { id: 'room_rect',        label: 'חדר מלבני',       icon: <Square size={16} />,        group: 'rooms' },
  { id: 'room_polygon',     label: 'חדר חופשי',       icon: <PenLine size={16} />,       group: 'rooms' },
  { id: 'wall_demolition',  label: 'קיר הריסה',       icon: <Hammer size={16} />,        group: 'walls' },
  { id: 'wall_new',         label: 'קיר חדש',         icon: <Minus size={16} />,         group: 'walls' },
  { id: 'point_electrical', label: 'נקודת חשמל',      icon: <Zap size={16} />,           group: 'points' },
  { id: 'point_water',      label: 'נקודת מים',       icon: <Droplets size={16} />,      group: 'points' },
  { id: 'point_ac',         label: 'מזגן',            icon: <Wind size={16} />,          group: 'points' },
  { id: 'point_lighting', label: 'נקודת תאורה', icon: <Lightbulb size={16} />, group: 'points' },
  { id: 'point_door',     label: 'דלת',          icon: <DoorOpen  size={16} />, group: 'points' },
  { id: 'point_window',   label: 'חלון',         icon: <AppWindow size={16} />, group: 'points' },
  { id: 'area_flooring',    label: 'אזור ריצוף',      icon: <Grid3x3 size={16} />,       group: 'areas' },
  { id: 'area_painting',    label: 'אזור צבע',        icon: <Paintbrush size={16} />,    group: 'areas' },
];

const GROUP_LABELS: Record<string, string> = {
  nav: 'ניווט',
  calibrate: 'קנה מידה',
  rooms: 'חדרים',
  walls: 'קירות',
  points: 'נקודות',
  areas: 'אזורים',
};

const TOOL_COLORS: Partial<Record<BlueprintToolType, string>> = {
  wall_demolition: 'text-red-500',
  wall_new: 'text-blue-500',
  point_electrical: 'text-amber-500',
  point_water: 'text-cyan-500',
  point_ac: 'text-purple-500',
  area_flooring: 'text-green-600',
  area_painting: 'text-orange-500',
  scale_calibrate: 'text-amber-600',
  point_lighting: 'text-yellow-400',
  point_door:     'text-amber-600',
  point_window:   'text-sky-400',
};

interface Props {
  activeTool: BlueprintToolType;
  onToolChange: (t: BlueprintToolType) => void;
  calibration: BpCalibration;
  scale: number;
  showBOQ: boolean;
  selectedId: string | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitScreen: () => void;
  onResetView: () => void;
  onFullscreen: () => void;
  onToggleBOQ: () => void;
  onDeleteSelected: () => void;
  onClearAll?: () => void;
}

export default function BlueprintToolbar({
  activeTool, onToolChange, calibration, scale, showBOQ, selectedId,
  onZoomIn, onZoomOut, onFitScreen, onResetView, onFullscreen,
  onToggleBOQ, onDeleteSelected,
}: Props) {
  const groups = [...new Set(TOOLS.map((t) => t.group))];

  return (
    <div
      className="flex items-center gap-1 px-3 py-2 bg-slate-800 border-b border-slate-700 overflow-x-auto flex-shrink-0"
      dir="ltr"
    >
      {/* Tool groups */}
      {groups.map((group, gi) => (
        <div key={group} className="flex items-center gap-0.5">
          {gi > 0 && <div className="w-px h-6 bg-slate-600 mx-1.5 flex-shrink-0" />}
          <span className="text-slate-500 text-[10px] font-bold uppercase mr-1 flex-shrink-0 hidden lg:block">
            {GROUP_LABELS[group]}
          </span>
          {TOOLS.filter((t) => t.group === group).map((tool) => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              title={tool.label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0
                ${activeTool === tool.id
                  ? 'bg-amber-500 text-slate-900'
                  : `bg-transparent text-slate-300 hover:bg-slate-700 hover:text-white ${TOOL_COLORS[tool.id] ?? ''}`
                }`}
            >
              <span className={activeTool === tool.id ? '' : (TOOL_COLORS[tool.id] ?? 'text-slate-300')}>
                {tool.icon}
              </span>
              <span className="hidden xl:block whitespace-nowrap">{tool.label}</span>
            </button>
          ))}
        </div>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Scale info */}
      {calibration.pixelsPerMeter ? (
        <span className="text-xs text-green-400 font-semibold flex-shrink-0 hidden md:block">
          ✓ {calibration.pixelsPerMeter.toFixed(0)} px/m
        </span>
      ) : (
        <span className="text-xs text-amber-400 flex-shrink-0 hidden md:block">
          לא מכויל
        </span>
      )}

      <div className="w-px h-6 bg-slate-600 mx-1.5 flex-shrink-0" />

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button onClick={onZoomOut} title="הקטן" className="btn-toolbar">
          <ZoomOut size={15} />
        </button>
        <span className="text-xs text-slate-400 w-12 text-center tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button onClick={onZoomIn} title="הגדל" className="btn-toolbar">
          <ZoomIn size={15} />
        </button>
        <button onClick={onFitScreen} title="התאם לחלון" className="btn-toolbar">
          <Maximize2 size={15} />
        </button>
        <button onClick={onResetView} title="אפס תצוגה" className="btn-toolbar">
          <RotateCcw size={14} />
        </button>
        <button onClick={onFullscreen} title="מסך מלא" className="btn-toolbar">
          <Maximize size={15} />
        </button>
      </div>

      <div className="w-px h-6 bg-slate-600 mx-1.5 flex-shrink-0" />

      {/* Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {selectedId && (
          <button
            onClick={onDeleteSelected}
            title="מחק נבחר"
            className="btn-toolbar text-red-400 hover:text-red-300 hover:bg-red-900/40"
          >
            <Trash2 size={15} />
          </button>
        )}
        <button
          onClick={onToggleBOQ}
          title="כתב כמויות"
          className={`btn-toolbar ${showBOQ ? 'text-amber-400' : 'text-slate-400'}`}
        >
          <ListChecks size={15} />
        </button>
      </div>
    </div>
  );
}
