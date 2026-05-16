import { useRef, useState } from 'react';
import { Upload, ImageIcon, FileText } from 'lucide-react';
import type { BpFile } from '../../types/blueprint';

interface Props {
  onFile: (file: BpFile) => void;
}

export default function BlueprintUploadZone({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function processFile(file: File) {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;

      if (file.type === 'application/pdf') {
        // Store the base64 dataUrl so the backend can analyze it via Claude Vision.
        // Canvas preview is not supported for PDFs — the backend handles the file.
        onFile({
          dataUrl,
          fileType: 'pdf',
          name: file.name,
          naturalWidth: 0,
          naturalHeight: 0,
        });
        return;
      }

      const img = new window.Image();
      img.onload = () => {
        onFile({
          dataUrl,
          fileType: 'image',
          name: file.name,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        });
      };
      img.src = dataUrl;
    };
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
    <div
      className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-5 text-center transition-colors cursor-pointer
        ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center">
        <Upload size={36} className="text-blue-500" />
      </div>

      <div>
        <p className="text-lg font-bold text-slate-800">העלה תוכנית בנייה</p>
        <p className="text-sm text-gray-500 mt-1">גרור לכאן או לחץ לבחירת קובץ</p>
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

      <p className="text-xs text-gray-300">גודל מקסימלי מומלץ: 10MB</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
