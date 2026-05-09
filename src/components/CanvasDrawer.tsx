import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CanvasDrawerProps {
  onClose: () => void;
  onInterpret: (imageData: string) => void;
}

export function CanvasDrawer({ onClose, onInterpret }: CanvasDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const interpretDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageData = canvas.toDataURL('image/png');
    onInterpret(imageData);
  };

  return (
    <Card className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50">
      <div className="bg-white p-4 rounded-lg">
        <h2 className="text-lg font-bold mb-4">Dibuja lo que quieres</h2>
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="border border-gray-300"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        <div className="flex gap-2 mt-4">
          <Button onClick={clearCanvas}>Limpiar</Button>
          <Button onClick={interpretDrawing}>Interpretar</Button>
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Card>
  );
}