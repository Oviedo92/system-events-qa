import { useRef, useState, type MouseEvent, type TouchEvent } from 'react';
import { Eraser, PenTool } from 'lucide-react';

interface DigitalSignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
}

export default function DigitalSignaturePad({
  onSignatureChange,
}: DigitalSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);

  function getCoords(e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startDrawing(e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#15172b';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  }

  function draw(e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStroke(true);
  }

  function stopDrawing() {
    if (!drawing) return;
    setDrawing(false);
    if (canvasRef.current && hasStroke) {
      onSignatureChange(canvasRef.current.toDataURL('image/png'));
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
    onSignatureChange(null);
  }

  return (
    <div
      data-testid="digital-signature-pad"
      className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#15172b] uppercase">
          <PenTool className="h-3.5 w-3.5 text-[#7765f8]" />
          Firma Digital Manuscrita (Contrato de Mandato y Ley 1581) *
        </span>
        <button
          type="button"
          data-testid="btn-clear-signature"
          onClick={clearCanvas}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          <Eraser className="h-3 w-3" />
          Limpiar
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={520}
        height={130}
        data-testid="canvas-signature"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="w-full cursor-crosshair rounded-xl border border-dashed border-slate-300 bg-white touch-none"
      />

      <p className="text-[11px] text-slate-500">
        Traza tu firma dentro del recuadro blanco para aceptar las tarifas por servicio, tiempos de liquidación y tratamiento de datos.
      </p>
    </div>
  );
}