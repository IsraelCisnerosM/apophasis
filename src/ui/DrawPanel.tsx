import { Trash2, Send, X, Loader } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { interpretDrawing, buildToolCallFromInterpretation } from '@/lib/interpretDrawing'
import { useDrawing } from '@/hooks/useDrawing'
import { useStore } from '@/store'

interface DrawPanelProps {
  onClose: () => void
  onToolCall?: (toolName: string, params: Record<string, unknown>) => void
}

const PRESET_COLORS = [
  { name: 'black', value: '#000000' },
  { name: 'red', value: '#EF4444' },
  { name: 'blue', value: '#3B82F6' },
  { name: 'green', value: '#10B981' },
  { name: 'yellow', value: '#FBBF24' },
  { name: 'purple', value: '#8B5CF6' },
]

export function DrawPanel({ onClose, onToolCall }: DrawPanelProps) {
  const { canvasRef, startStroke, drawStroke, endStroke, clearCanvas, getImageData, setColor, setWidth } = useDrawing(
    800,
    600,
  )
  const addEvent = useStore((s) => s.addEvent)
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
      // Step 1: Send to Gemini Vision to interpret the drawing
      const interpretation = await interpretDrawing(imageData, description)

      // Log the interpretation
      addEvent({
        kind: 'note',
        title: 'Drawing interpreted',
        detail: interpretation.description,
        data: {
          imageData,
          description,
          interpretation,
        },
      })

      // Step 2: Build tool call based on interpretation
      const { toolName, params } = buildToolCallFromInterpretation(interpretation)

      // Step 3: Trigger the tool call (Lucy will handle it from the live session)
      if (onToolCall) {
        onToolCall(toolName, params)
      }

      // Log the tool call
      addEvent({
        kind: 'note',
        title: `Triggered: ${toolName}`,
        detail: `Query: ${interpretation.searchQuery}`,
        data: { toolName, params },
      })

      // Close the drawing panel
      onClose()
    } catch (error) {
      console.error('Error processing drawing:', error)
      addEvent({
        kind: 'note',
        title: 'Error processing drawing',
        detail: error instanceof Error ? error.message : 'Unknown error',
      })
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
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0" disabled={isSubmitting}>
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
            style={{ maxHeight: '400px', width: '100%' }}
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
              disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none transition-colors focus:border-white/30 focus:bg-white/10 disabled:opacity-50"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Status Message */}
        {isSubmitting && (
          <div className="flex items-center gap-2 rounded-lg bg-blue/10 border border-blue/20 px-4 py-2">
            <Loader className="size-4 animate-spin text-blue-400" />
            <span className="text-sm text-blue-200">Lucy is analyzing your drawing...</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            className="gap-2"
            disabled={isSubmitting}
          >
            <Trash2 className="size-4" />
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <Loader className="size-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="size-4" />
                Submit
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
