import {
  forwardRef, useEffect, useImperativeHandle, useRef, useState,
} from 'react';
import {
  Stage, Layer, Image as KonvaImage, Line, Circle, Rect, Text, Group,
} from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { v4 as uuidv4 } from 'uuid';
import { useBlueprintStore } from '../../stores/blueprintStore';
import { polygonAreaPixels, polygonCentroid } from '../../lib/blueprintBOQ';
import CalibrationDialog from './CalibrationDialog';
import RoomNameDialog from './RoomNameDialog';
import type { BpAnnotationType, BpFile, BpPoint } from '../../types/blueprint';

// ─── Annotation visual config ─────────────────────────────────────────────────

const ANN_CFG: Record<BpAnnotationType, { fill: string; stroke: string; label: string }> = {
  electrical_point: { fill: '#fef08a', stroke: '#ca8a04', label: 'ח' },
  water_point:      { fill: '#bae6fd', stroke: '#0284c7', label: 'מ' },
  ac_point:         { fill: '#e9d5ff', stroke: '#7c3aed', label: 'מז' },
  demolition_wall:  { fill: '#fca5a5', stroke: '#dc2626', label: '' },
  new_wall:         { fill: '#bfdbfe', stroke: '#2563eb', label: '' },
  flooring_area:    { fill: 'rgba(16,185,129,0.15)', stroke: '#059669', label: 'ריצוף' },
  painting_area:    { fill: 'rgba(249,115,22,0.15)', stroke: '#ea580c', label: 'צבע' },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingRoom {
  polygonPoints: BpPoint[];
  pixelArea: number;
  drawType: 'rectangle' | 'polygon';
}

export interface BlueprintCanvasHandle {
  fitToScreen: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

interface Props {
  file: BpFile | null;
  onSelectChange: (id: string | null, type: 'room' | 'annotation' | null) => void;
  onScaleChange: (s: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const BlueprintCanvas = forwardRef<BlueprintCanvasHandle, Props>(
  ({ file, onSelectChange, onScaleChange }, ref) => {
    const {
      activeTool, calibration, rooms, annotations,
      setCalibration, addRoom, deleteRoom, addAnnotation, deleteAnnotation,
    } = useBlueprintStore();

    const stageRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const panStart = useRef<{ mx: number; my: number; sx: number; sy: number } | null>(null);
    const suppressClick = useRef(false);

    // Viewport
    const [scale, setScaleState] = useState(1);
    const [pos, setPosState] = useState({ x: 0, y: 0 });
    const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
    const [konvaImage, setKonvaImage] = useState<HTMLImageElement | null>(null);

    // Drawing state
    const [cursorPos, setCursorPos] = useState<BpPoint | null>(null);
    const [polygonPts, setPolygonPts] = useState<BpPoint[]>([]);
    const [rectStart, setRectStart] = useState<BpPoint | null>(null);
    const [rectCurrent, setRectCurrent] = useState<BpPoint | null>(null);
    const [lineStart, setLineStart] = useState<BpPoint | null>(null);
    const [calibP1, setCalibP1] = useState<BpPoint | null>(null);
    const [isPanning, setIsPanning] = useState(false);

    // Selection
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<'room' | 'annotation' | null>(null);

    // Dialogs
    const [showCalibDialog, setShowCalibDialog] = useState(false);
    const [calibPixelDist, setCalibPixelDist] = useState(0);
    const [calibP2, setCalibP2] = useState<BpPoint | null>(null);
    const [showRoomDialog, setShowRoomDialog] = useState(false);
    const [pendingRoom, setPendingRoom] = useState<PendingRoom | null>(null);

    function setScale(s: number) {
      setScaleState(s);
      onScaleChange(s);
    }

    // ── Image loading ────────────────────────────────────────────────────────

    useEffect(() => {
      if (!file?.dataUrl) { setKonvaImage(null); return; }
      const img = new window.Image();
      img.onload = () => setKonvaImage(img);
      img.src = file.dataUrl;
    }, [file?.dataUrl]);

    // ── Resize observer ──────────────────────────────────────────────────────

    useEffect(() => {
      if (!containerRef.current) return;
      const obs = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) setStageSize({ width, height });
        }
      });
      obs.observe(containerRef.current);
      return () => obs.disconnect();
    }, []);

    // ── Fit on file load ─────────────────────────────────────────────────────

    useEffect(() => {
      if (file?.naturalWidth) {
        setTimeout(fitToScreen, 80);
      }
    }, [file?.dataUrl]);

    // ── Keyboard shortcuts ───────────────────────────────────────────────────

    useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') cancelDrawing();
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }, []);

    // ── Exposed handle ───────────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      fitToScreen,
      zoomIn: () => {
        setScale(Math.min(scale * 1.3, 20));
        setPosState((p) => p); // trigger re-render
      },
      zoomOut: () => {
        setScale(Math.max(scale / 1.3, 0.05));
      },
      resetView: () => {
        setScale(1);
        setPosState({ x: 0, y: 0 });
      },
    }));

    // ── Helpers ──────────────────────────────────────────────────────────────

    function fitToScreen() {
      if (!file?.naturalWidth || !containerRef.current) return;
      const cw = containerRef.current.clientWidth || stageSize.width;
      const ch = containerRef.current.clientHeight || stageSize.height;
      const pad = 40;
      const s = Math.min((cw - pad) / file.naturalWidth, (ch - pad) / file.naturalHeight);
      const newPos = {
        x: (cw - file.naturalWidth * s) / 2,
        y: (ch - file.naturalHeight * s) / 2,
      };
      setScale(s);
      setPosState(newPos);
    }

    function getCanvasPos(_e: KonvaEventObject<MouseEvent>): BpPoint {
      const stage = stageRef.current;
      const ptr = stage.getPointerPosition()!;
      return { x: (ptr.x - pos.x) / scale, y: (ptr.y - pos.y) / scale };
    }

    function cancelDrawing() {
      setPolygonPts([]);
      setRectStart(null);
      setRectCurrent(null);
      setLineStart(null);
      setCalibP1(null);
    }

    function select(id: string | null, type: 'room' | 'annotation' | null) {
      setSelectedId(id);
      setSelectedType(type);
      onSelectChange(id, type);
    }

    function getCursor(): string {
      if (isPanning) return 'grabbing';
      if (activeTool === 'pan') return 'grab';
      if (activeTool === 'select') return 'default';
      return 'crosshair';
    }

    // ── Tool handlers ────────────────────────────────────────────────────────

    function handleCalibrationClick(cp: BpPoint) {
      if (!calibP1) {
        setCalibP1(cp);
      } else {
        const dist = Math.hypot(cp.x - calibP1.x, cp.y - calibP1.y);
        if (dist < 5) return;
        setCalibP2(cp);
        setCalibPixelDist(dist);
        setShowCalibDialog(true);
      }
    }

    function handlePolygonClick(cp: BpPoint) {
      if (polygonPts.length >= 3) {
        const first = polygonPts[0];
        if (Math.hypot(cp.x - first.x, cp.y - first.y) < 15 / scale) {
          finishPolygon();
          return;
        }
      }
      setPolygonPts((prev) => [...prev, cp]);
    }

    function handleLineClick(cp: BpPoint) {
      if (!lineStart) {
        setLineStart(cp);
      } else {
        const type: BpAnnotationType = activeTool === 'wall_demolition' ? 'demolition_wall' : 'new_wall';
        addAnnotation({ id: uuidv4(), type, x1: lineStart.x, y1: lineStart.y, x2: cp.x, y2: cp.y });
        setLineStart(null);
      }
    }

    function placePoint(cp: BpPoint) {
      const typeMap: Record<string, BpAnnotationType> = {
        point_electrical: 'electrical_point',
        point_water: 'water_point',
        point_ac: 'ac_point',
      };
      const type = typeMap[activeTool];
      if (type) addAnnotation({ id: uuidv4(), type, x: cp.x, y: cp.y });
    }

    function finishPolygon() {
      if (polygonPts.length < 3) return;
      const pixelArea = polygonAreaPixels(polygonPts);
      const ppm = calibration.pixelsPerMeter;
      const sqm = ppm ? pixelArea / (ppm * ppm) : 0;

      if (activeTool === 'room_polygon') {
        setPendingRoom({ polygonPoints: [...polygonPts], pixelArea, drawType: 'polygon' });
        setShowRoomDialog(true);
      } else {
        const aType: BpAnnotationType = activeTool === 'area_flooring' ? 'flooring_area' : 'painting_area';
        addAnnotation({ id: uuidv4(), type: aType, polygonPoints: [...polygonPts], calculatedSqm: sqm });
      }
      setPolygonPts([]);
    }

    function commitRoom(name: string) {
      if (!pendingRoom) return;
      const { polygonPoints, pixelArea, drawType } = pendingRoom;
      const ppm = calibration.pixelsPerMeter;
      const sqm = ppm ? pixelArea / (ppm * ppm) : 0;
      addRoom({ id: uuidv4(), name, polygonPoints, calculatedSqm: sqm, drawType });
      setPendingRoom(null);
      setShowRoomDialog(false);
    }

    function commitCalibration(meters: number) {
      if (!calibP1 || !calibP2) return;
      const ppm = calibPixelDist / meters;
      setCalibration({ pixelsPerMeter: ppm, refPoint1: calibP1, refPoint2: calibP2 });
      setCalibP1(null);
      setCalibP2(null);
      setShowCalibDialog(false);
    }

    function handleDeleteSelected() {
      if (!selectedId || !selectedType) return;
      if (selectedType === 'room') deleteRoom(selectedId);
      else deleteAnnotation(selectedId);
      select(null, null);
    }

    // Expose delete to parent via window event (simple approach for MVP)
    useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
          handleDeleteSelected();
        }
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }, [selectedId, selectedType]);

    // ── Stage events ─────────────────────────────────────────────────────────

    function handleWheel(e: KonvaEventObject<WheelEvent>) {
      e.evt.preventDefault();
      const stage = stageRef.current;
      const ptr = stage.getPointerPosition()!;
      const oldScale = scale;
      const dir = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = Math.min(Math.max(dir > 0 ? oldScale * 1.15 : oldScale / 1.15, 0.05), 20);
      const mouseCanvasX = (ptr.x - pos.x) / oldScale;
      const mouseCanvasY = (ptr.y - pos.y) / oldScale;
      setScale(newScale);
      setPosState({ x: ptr.x - mouseCanvasX * newScale, y: ptr.y - mouseCanvasY * newScale });
    }

    function handleMouseDown(e: KonvaEventObject<MouseEvent>) {
      if (e.evt.button !== 0) return;

      if (activeTool === 'pan') {
        setIsPanning(true);
        panStart.current = { mx: e.evt.clientX, my: e.evt.clientY, sx: pos.x, sy: pos.y };
        return;
      }

      if (activeTool === 'room_rect') {
        const cp = getCanvasPos(e);
        setRectStart(cp);
        setRectCurrent(cp);
      }
    }

    function handleMouseMove(e: KonvaEventObject<MouseEvent>) {
      const stage = stageRef.current;
      const ptr = stage.getPointerPosition()!;
      const cp = { x: (ptr.x - pos.x) / scale, y: (ptr.y - pos.y) / scale };
      setCursorPos(cp);

      if (isPanning && panStart.current) {
        const dx = e.evt.clientX - panStart.current.mx;
        const dy = e.evt.clientY - panStart.current.my;
        setPosState({ x: panStart.current.sx + dx, y: panStart.current.sy + dy });
        return;
      }

      if (activeTool === 'room_rect' && rectStart) {
        setRectCurrent(cp);
      }
    }

    function handleMouseUp(e: KonvaEventObject<MouseEvent>) {
      if (e.evt.button !== 0) return;

      if (isPanning) {
        setIsPanning(false);
        panStart.current = null;
        return;
      }

      if (activeTool === 'room_rect' && rectStart && rectCurrent) {
        const w = Math.abs(rectCurrent.x - rectStart.x);
        const h = Math.abs(rectCurrent.y - rectStart.y);
        if (w > 5 && h > 5) {
          const x0 = Math.min(rectStart.x, rectCurrent.x);
          const y0 = Math.min(rectStart.y, rectCurrent.y);
          const pts = [
            { x: x0, y: y0 }, { x: x0 + w, y: y0 },
            { x: x0 + w, y: y0 + h }, { x: x0, y: y0 + h },
          ];
          setPendingRoom({ polygonPoints: pts, pixelArea: w * h, drawType: 'rectangle' });
          setShowRoomDialog(true);
          suppressClick.current = true;
        }
        setRectStart(null);
        setRectCurrent(null);
      }
    }

    function handleStageClick(e: KonvaEventObject<MouseEvent>) {
      if (suppressClick.current) { suppressClick.current = false; return; }
      if (e.evt.button !== 0) return;
      if (isPanning) return;

      // In select mode, clicking empty canvas = deselect
      if (activeTool === 'select') {
        if (e.target === e.target.getStage()) select(null, null);
        return;
      }

      const cp = getCanvasPos(e);

      switch (activeTool) {
        case 'scale_calibrate': handleCalibrationClick(cp); break;
        case 'room_polygon':
        case 'area_flooring':
        case 'area_painting':   handlePolygonClick(cp); break;
        case 'wall_demolition':
        case 'wall_new':        handleLineClick(cp); break;
        case 'point_electrical':
        case 'point_water':
        case 'point_ac':        placePoint(cp); break;
      }
    }

    function handleDblClick(_e: KonvaEventObject<MouseEvent>) {
      if (['room_polygon', 'area_flooring', 'area_painting'].includes(activeTool) && polygonPts.length >= 3) {
        suppressClick.current = true;
        finishPolygon();
      }
    }

    // ── Render helpers ────────────────────────────────────────────────────────

    function renderRoom(room: typeof rooms[0]) {
      const pts = room.polygonPoints.flatMap((p) => [p.x, p.y]);
      const center = polygonCentroid(room.polygonPoints);
      const isSel = selectedId === room.id;
      const hasScale = !!calibration.pixelsPerMeter;
      const label = hasScale ? `${room.name}\n${room.calculatedSqm.toFixed(1)} מ״ר` : room.name;
      return (
        <Group
          key={room.id}
          listening={activeTool === 'select'}
          onClick={(e) => { e.cancelBubble = true; select(room.id, 'room'); }}
        >
          <Line
            points={pts}
            closed
            fill="rgba(59,130,246,0.12)"
            stroke={isSel ? '#1d4ed8' : '#3b82f6'}
            strokeWidth={isSel ? 3 : 2}
            strokeScaleEnabled={false}
          />
          <Text
            x={center.x - 50}
            y={center.y - 14}
            width={100}
            text={label}
            fontSize={12}
            fill={isSel ? '#1d4ed8' : '#1e3a8a'}
            fontStyle="bold"
            align="center"
            fontFamily="Arial"
          />
        </Group>
      );
    }

    function renderAnnotation(ann: typeof annotations[0]) {
      const isSel = selectedId === ann.id;
      const cfg = ANN_CFG[ann.type];
      const onAnnClick = (e: KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        select(ann.id, 'annotation');
      };

      // Point markers
      if (['electrical_point', 'water_point', 'ac_point'].includes(ann.type) && ann.x != null) {
        return (
          <Group key={ann.id} listening={activeTool === 'select'} onClick={onAnnClick}>
            <Circle
              x={ann.x} y={ann.y} radius={13}
              fill={cfg.fill} stroke={isSel ? '#1d4ed8' : cfg.stroke}
              strokeWidth={isSel ? 3 : 2} strokeScaleEnabled={false}
            />
            <Text
              x={(ann.x ?? 0) - 13} y={(ann.y ?? 0) - 7}
              width={26} text={cfg.label}
              fontSize={11} fontStyle="bold"
              fill={cfg.stroke} align="center"
              fontFamily="Arial"
            />
          </Group>
        );
      }

      // Wall lines
      if (['demolition_wall', 'new_wall'].includes(ann.type) && ann.x1 != null) {
        return (
          <Line
            key={ann.id}
            points={[ann.x1!, ann.y1!, ann.x2!, ann.y2!]}
            stroke={isSel ? '#1d4ed8' : cfg.stroke}
            strokeWidth={isSel ? 5 : 3}
            dash={ann.type === 'demolition_wall' ? [8, 4] : []}
            strokeScaleEnabled={false}
            listening={activeTool === 'select'}
            onClick={onAnnClick}
            hitStrokeWidth={20}
          />
        );
      }

      // Area polygons
      if (['flooring_area', 'painting_area'].includes(ann.type) && ann.polygonPoints?.length) {
        const pts = ann.polygonPoints.flatMap((p) => [p.x, p.y]);
        const center = polygonCentroid(ann.polygonPoints);
        return (
          <Group key={ann.id} listening={activeTool === 'select'} onClick={onAnnClick}>
            <Line
              points={pts} closed
              fill={cfg.fill}
              stroke={isSel ? '#1d4ed8' : cfg.stroke}
              strokeWidth={isSel ? 3 : 2}
              strokeScaleEnabled={false}
            />
            {ann.calculatedSqm && (
              <Text
                x={center.x - 40} y={center.y - 7}
                width={80} text={`${ann.calculatedSqm.toFixed(1)} מ״ר`}
                fontSize={11} fill={cfg.stroke} align="center" fontFamily="Arial"
              />
            )}
          </Group>
        );
      }

      return null;
    }

    // ── Preview shapes (drawing layer) ────────────────────────────────────────

    const previewColor = (() => {
      switch (activeTool) {
        case 'wall_demolition': return '#ef4444';
        case 'wall_new':        return '#3b82f6';
        case 'area_flooring':   return '#10b981';
        case 'area_painting':   return '#f97316';
        default:                return '#6366f1';
      }
    })();

    // ── Calibration saved markers ─────────────────────────────────────────────

    const calRef1 = calibration.refPoint1;
    const calRef2 = calibration.refPoint2;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-slate-100"
        style={{ cursor: getCursor() }}
      >
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={scale}
          scaleY={scale}
          x={pos.x}
          y={pos.y}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleStageClick}
          onDblClick={handleDblClick}
        >
          {/* Layer 1: Background image */}
          <Layer>
            {konvaImage && file && (
              <KonvaImage image={konvaImage} x={0} y={0} width={file.naturalWidth} height={file.naturalHeight} />
            )}
          </Layer>

          {/* Layer 2: Saved rooms and annotations */}
          <Layer>
            {/* Calibration reference markers */}
            {calRef1 && calRef2 && (
              <>
                <Line
                  points={[calRef1.x, calRef1.y, calRef2.x, calRef2.y]}
                  stroke="#ef4444" strokeWidth={1} dash={[4, 4]} strokeScaleEnabled={false}
                  listening={false}
                />
                <Circle x={calRef1.x} y={calRef1.y} radius={5} fill="#ef4444" listening={false} />
                <Circle x={calRef2.x} y={calRef2.y} radius={5} fill="#ef4444" listening={false} />
                <Text
                  x={(calRef1.x + calRef2.x) / 2 - 40}
                  y={(calRef1.y + calRef2.y) / 2 - 16}
                  width={80}
                  text={`${calibration.pixelsPerMeter!.toFixed(0)}px/m`}
                  fontSize={10} fill="#ef4444" align="center" fontFamily="Arial"
                  listening={false}
                />
              </>
            )}

            {/* Rooms */}
            {rooms.map(renderRoom)}

            {/* Annotations */}
            {annotations.map(renderAnnotation)}
          </Layer>

          {/* Layer 3: Drawing preview (never intercepts events) */}
          <Layer listening={false}>
            {/* Rectangle room preview */}
            {activeTool === 'room_rect' && rectStart && rectCurrent && (
              <Rect
                x={Math.min(rectStart.x, rectCurrent.x)}
                y={Math.min(rectStart.y, rectCurrent.y)}
                width={Math.abs(rectCurrent.x - rectStart.x)}
                height={Math.abs(rectCurrent.y - rectStart.y)}
                fill="rgba(59,130,246,0.1)"
                stroke="#3b82f6"
                strokeWidth={2}
                dash={[5, 5]}
                strokeScaleEnabled={false}
              />
            )}

            {/* Polygon / area preview */}
            {polygonPts.length > 0 && (
              <>
                <Line
                  points={[
                    ...polygonPts.flatMap((p) => [p.x, p.y]),
                    ...(cursorPos ? [cursorPos.x, cursorPos.y] : []),
                  ]}
                  stroke={previewColor}
                  strokeWidth={2}
                  dash={[5, 5]}
                  strokeScaleEnabled={false}
                />
                {polygonPts.map((p, i) => (
                  <Circle key={i} x={p.x} y={p.y} radius={4} fill={previewColor} />
                ))}
                {/* Close indicator near first point */}
                {polygonPts.length >= 3 && cursorPos &&
                  Math.hypot(cursorPos.x - polygonPts[0].x, cursorPos.y - polygonPts[0].y) < 15 / scale && (
                  <Circle x={polygonPts[0].x} y={polygonPts[0].y} radius={8}
                    stroke={previewColor} strokeWidth={2} fill="rgba(255,255,255,0.6)"
                    strokeScaleEnabled={false}
                  />
                )}
              </>
            )}

            {/* Line (wall) preview */}
            {lineStart && cursorPos && (
              <>
                <Line
                  points={[lineStart.x, lineStart.y, cursorPos.x, cursorPos.y]}
                  stroke={previewColor}
                  strokeWidth={3}
                  dash={activeTool === 'wall_demolition' ? [8, 4] : []}
                  strokeScaleEnabled={false}
                />
                <Circle x={lineStart.x} y={lineStart.y} radius={5} fill={previewColor} />
              </>
            )}

            {/* Calibration preview */}
            {calibP1 && (
              <>
                <Circle x={calibP1.x} y={calibP1.y} radius={6} fill="#ef4444" />
                {cursorPos && (
                  <Line
                    points={[calibP1.x, calibP1.y, cursorPos.x, cursorPos.y]}
                    stroke="#ef4444" strokeWidth={1.5} dash={[5, 5]} strokeScaleEnabled={false}
                  />
                )}
              </>
            )}
          </Layer>
        </Stage>

        {/* Dialogs */}
        {showCalibDialog && (
          <CalibrationDialog
            pixelDist={calibPixelDist}
            onConfirm={commitCalibration}
            onCancel={() => { setShowCalibDialog(false); setCalibP1(null); setCalibP2(null); }}
          />
        )}

        {showRoomDialog && pendingRoom && (
          <RoomNameDialog
            sqm={calibration.pixelsPerMeter ? pendingRoom.pixelArea / (calibration.pixelsPerMeter ** 2) : 0}
            hasScale={!!calibration.pixelsPerMeter}
            onConfirm={commitRoom}
            onCancel={() => { setShowRoomDialog(false); setPendingRoom(null); }}
          />
        )}
      </div>
    );
  }
);

BlueprintCanvas.displayName = 'BlueprintCanvas';
export default BlueprintCanvas;
