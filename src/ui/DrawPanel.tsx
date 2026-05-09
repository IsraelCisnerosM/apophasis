import { Trash2, Send, X, Loader } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { interpretDrawing } from '@/lib/interpretDrawing'
import { useDrawing } from '@/hooks/useDrawing'
import { useStore } from '@/store'
import { useT } from '@/hooks/useT'
  { name: 'black', value: '#000000' },
  { name: 'red', value: '#EF4444' },
  { name: 'blue', value: '#3B82F6' },
  { name: 'green', value: '#10B981' },
  { name: 'yellow', value: '#FBBF24' },
  { name: 'purple', value: '#8B5CF6' },
]

export function DrawPanel({ onClose, onSubmit }: DrawPanelProps) {
  const { t } = useT()
  const { canvasRef, startStroke, drawStroke, endStroke, clearCanvas, getImageData, setColor, setWidth } = useDrawing(
    800,
    600,
  )
  const [brushWidth, setBrushWidth] = useState(2)
  const [brushColor, setBrushColor] = useState('#000000')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [description, setDescription] = useState('')

  const handleColorChange = (color: string) => {
    setBrushColor(color)
    setColor(color)
  }

  const handleWidthChange = (width: number[]) => {
    setBrushWidth(width[0])
    setWidth(width[0])
  }

  const handleSubmit = async () => {
    const imageData = getImageData()
    if (!imageData) {
      console.error('Failed to capture canvas')
      return
    }

    setIsSubmitting(true)

    try {
      // TODO: Send to Gemini Vision to analyze the drawing
      // For now, we'll just pass the image and let the user provide context
      onSubmit(imageData, description)
    } catch (error) {
      console.error('Error processing drawing:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex max-h-screen w-full max-w-4xl flex-col gap-4 rounded-lg border border-white/10 bg-background/95 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Draw something</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="size-4" />
          </Button>
        </div>

        {/* Canvas */}
        <div className="overflow-auto rounded-lg border border-white/10 bg-white">
          <canvas
            ref={canvasRef}
            onPointerDown={startStroke}
            onPointerMove={drawStroke}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
            className="cursor-crosshair touch-none"
          />
        </div>

        {/* Controls */}
        <div className="grid gap-4">
          {/* Brush Width */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-white/70">Brush Size</label>
            <Slider
              value={[brushWidth]}
              onValueChange={handleWidthChange}
              min={1}
              max={20}
              step={1}
              className="flex-1"
            />
            <span className="w-8 text-right text-sm text-white/70">{brushWidth}</span>
          </div>

          {/* Color Picker */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-white/70">Color</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorChange(color.value)}
                  className={`size-8 rounded-full border-2 transition-all ${
                    brushColor === color.value ? 'border-white scale-110' : 'border-white/20 hover:border-white/50'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Description (optional context) */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white/70">What are you drawing? (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., 'a sunset', 'a building', 'a person'"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none transition-colors focus:border-white/30 focus:bg-white/10"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={clearCanvas} className="gap-2">
            <Trash2 className="size-4" />
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
            <Send className="size-4" />
            {isSubmitting ? 'Processing...' : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Import useT for i18n (assuming it exists in the project)
import { useT } from '@/hooks/useT'
