import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

export default function ImageModal({ src, alt, isOpen, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!isOpen) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.35, 3.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.35, 0.75));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      {/* Control bar */}
      <div className="absolute top-6 right-6 flex items-center space-x-3 z-50">
        <div className="flex items-center space-x-1 bg-slate-900/90 border border-slate-700/80 rounded-xl px-2 py-1.5 backdrop-blur-md shadow-2xl">
          <button
            onClick={handleZoomIn}
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition"
            title="Reset Zoom"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 bg-rose-950/80 border border-rose-500/40 text-rose-300 hover:bg-rose-900 hover:text-white rounded-xl shadow-lg transition"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div
        className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={src}
          alt={alt}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="max-h-[85vh] max-w-[85vw] object-contain rounded-2xl shadow-2xl border border-cyan-500/20 select-none pointer-events-auto"
          draggable={false}
        />
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 border border-slate-700/80 px-4 py-2 rounded-full text-xs text-slate-400 font-mono pointer-events-none">
        Drag to Pan • Click & Use Zoom Tools • ESC to Close
      </div>
    </div>
  );
}
