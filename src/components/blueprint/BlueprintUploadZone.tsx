import { useRef, useState } from 'react';
import { Upload, ImageIcon, FileText, Loader } from 'lucide-react';
import type { BpFile } from '../../types/blueprint';

interface Props {
  onFile: (file: BpFile) => void;
}

// Anthropic Claude Vision: max 5MB decoded, recommended ≤1568px on long edge
const MAX_LONG_EDGE = 1568;
const JPEG_QUALITY = 0.85;

function resizeImageDataUrl(
  img: HTMLImageElement,
  originalDataUrl: string,
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve) => {
    const origW = img.naturalWidth;
    const origH = img.naturalHeight;
    const longEdge = Math.max(origW, origH);

    // Estimate decoded size (~3 bytes per base64 char * 4/3 = raw base64 * 0.75)
    const approxDecodedBytes = (originalDataUrl.length - originalDataUrl.indexOf(',') - 1) * 0.75;
    const needsResize = longEdge > MAX_LONG_EDGE || approxDecodedBytes > 4.5 * 1024 * 1024;

    if (!needsResize) {
      resolve({ dataUrl: originalDataUrl, width: origW, height: origH });
      return;
    }

    const scale = Math.min(MAX_LONG_EDGE / origW, MAX_LONG_EDGE / origH, 1);
    const w = Math.round(origW * scale);
    const h = Math.round(origH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    resolve({ dataUrl, width: w, height: h });
  });
}

export default function BlueprintUploadZone({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sizeNote, setSizeNote] = useState<string | null>(null);

  async function processFile(file: File) {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return;

    setProcessing(true);
    setSizeNote(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawDataUrl = e.target?.result as string;

      if (file.type === 'application/pdf') {
        onFile({
          dataUrl: rawDataUrl,
          fileType: 'pdf',
          name: file.name,
          naturalWidth: 0,
          naturalHeight: 0,
        });
        setProcessing(false);
        return;
      }

      const img = new window.Image();
      img.onload = async () => {
        const origLong = Math.max(img.naturalWidth, img.naturalHeight);
        const { dataUrl, width, height } = await resizeImageDataUrl(img, rawDataUrl);

        if (origLong > MAX_LONG_EDGE) {
          setSizeNote(`תמונה הוקטנה מ-${img.naturalWidth}×${img.naturalHeight} ל-${width}×${height} לניתוח AI`);
        }

        onFile({
          dataUrl,
          fileType: 'image',
          name: file.name,
          naturalWidth: width,
          naturalHeight: height,
        });
        setProcessing(false);
      };
      img.onerror = () => setProcessing(false);
      img.src = rawDataUrl;
    };
    reader.onerror = () => setProcessing(false);
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-5 text-center transition-colors
          ${processing ? 'border-blue-300 bg-blue-50/30 cursor-wait' : 'cursor-pointer'}
          ${dragging ? 'border-blue-400 bg-blue-50' : !processing ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30' : ''}`}
        onClick={() => !processing && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!processing) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center">
          {processing
            ? <Loader size={36} className="text-blue-400 animate-spin" />
            : <Upload size={36} className="text-blue-500" />}
        </div>

        <div>
          <p className="text-lg font-bold text-slate-800">
            {processing ? 'מעבד קובץ...' : 'העלה תוכנית בנייה'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {processing ? 'מכין תמונה לניתוח AI' : 'גרור לכאן או לחץ לבחירת קובץ'}
          </p>
        </div>

        <div className="flex gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-1.5">
            <ImageIcon size={16} />
            <span>PNG, JPG, WEBP</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText size={16} />
            <span>PDF</span>
          </div>
        </div>

        <p className="text-xs text-gray-300">תמונות גדולות יוקטנו אוטומטית לניתוח AI</p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleChange}
          className="hidden"
          disabled={processing}
        />
      </div>

      {sizeNote && (
        <p className="text-xs text-blue-500 text-center">{sizeNote}</p>
      )}
    </div>
  );
}
