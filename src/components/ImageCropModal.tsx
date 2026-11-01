import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, ZoomIn, ZoomOut, RotateCw, Crop, RefreshCcw } from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  cropShape?: 'round' | 'rect';
  circularCrop?: boolean;
  aspectRatio?: number; // width / height, default 1
  onClose: () => void;
  onCropComplete: (croppedBase64: string) => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  cropShape = 'round',
  circularCrop,
  aspectRatio = 1,
  onClose,
  onCropComplete,
}) => {
  const resolvedShape = circularCrop !== undefined ? (circularCrop ? 'round' : 'rect') : cropShape;
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const generateCrop = () => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    const targetSize = 600;
    canvas.width = targetSize;
    canvas.height = targetSize / aspectRatio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    // Calculate source scale based on viewport container size (typically 280px in modal)
    const viewportWidth = 280;
    const factor = canvas.width / viewportWidth;
    ctx.translate(offset.x * factor, offset.y * factor);

    const aspect = img.naturalWidth / img.naturalHeight;
    let drawWidth = canvas.width;
    let drawHeight = canvas.width / aspect;

    if (drawHeight < canvas.height) {
      drawHeight = canvas.height;
      drawWidth = canvas.height * aspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCropComplete(croppedDataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Crop className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Crop &amp; Adjust Photo
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Crop Viewport */}
        <div className="mt-4 flex flex-col items-center">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`relative h-[260px] w-[260px] overflow-hidden bg-slate-900 shadow-inner select-none cursor-${
              isDragging ? 'grabbing' : 'grab'
            } ${resolvedShape === 'round' ? 'rounded-full ring-4 ring-amber-500/30' : 'rounded-2xl ring-4 ring-amber-500/30'}`}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              draggable={false}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${scale})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                maxWidth: 'none',
                maxHeight: 'none',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              className="pointer-events-none absolute inset-0 m-auto"
            />
            
            {/* Guide overlay */}
            <div className="pointer-events-none absolute inset-0 border border-white/40 border-dashed rounded-inherit" />
          </div>

          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Drag to reposition • Use slider to zoom
          </p>

          {/* Zoom Slider */}
          <div className="mt-3 w-full px-2 flex items-center gap-2">
            <ZoomOut className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg dark:bg-slate-700"
            />
            <ZoomIn className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[11px] font-mono text-slate-500 w-10 text-right">
              {Math.round(scale * 100)}%
            </span>
          </div>

          {/* Quick Transform Controls */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleRotate}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <RotateCw className="h-3 w-3" />
              <span>Rotate</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={generateCrop}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all cursor-pointer"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Apply Crop</span>
          </button>
        </div>
      </div>
    </div>
  );
};
