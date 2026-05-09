import { useEffect, useRef } from 'react'

export interface DrawingPoint {
  x: number
  y: number
  pressure?: number
}

export interface DrawingStroke {
  points: DrawingPoint[]
  color: string
  width: number
}

export interface UseDrawingReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  startStroke: (e: React.PointerEvent<HTMLCanvasElement>) => void
  drawStroke: (e: React.PointerEvent<HTMLCanvasElement>) => void
  endStroke: () => void
  clearCanvas: () => void
  getImageData: () => string | null
  getStrokes: () => DrawingStroke[]
  setColor: (color: string) => void
  setWidth: (width: number) => void
}

export function useDrawing(width: number = 800, height: number = 600): UseDrawingReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const isDrawingRef = useRef(false)
  const currentStrokeRef = useRef<DrawingStroke>({ points: [], color: '#000000', width: 2 })
  const strokesRef = useRef<DrawingStroke[]>([])
  const colorRef = useRef('#000000')
  const widthRef = useRef(2)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas size
    canvas.width = width
    canvas.height = height

    // Setup context
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 1.0

    // Set white background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)

    ctxRef.current = ctx
  }, [width, height])

  const startStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ctxRef.current) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const pressure = (e as any).pressure ?? 1

    isDrawingRef.current = true
    currentStrokeRef.current = {
      points: [{ x, y, pressure }],
      color: colorRef.current,
      width: widthRef.current,
    }

    const ctx = ctxRef.current
    ctx.strokeStyle = colorRef.current
    ctx.lineWidth = widthRef.current
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const drawStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !ctxRef.current) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const pressure = (e as any).pressure ?? 1

    currentStrokeRef.current.points.push({ x, y, pressure })

    const ctx = ctxRef.current
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const endStroke = () => {
    if (!isDrawingRef.current || !ctxRef.current) return

    isDrawingRef.current = false
    const ctx = ctxRef.current
    ctx.closePath()

    // Only store stroke if it has points
    if (currentStrokeRef.current.points.length > 0) {
      strokesRef.current.push({ ...currentStrokeRef.current })
    }

    currentStrokeRef.current = { points: [], color: colorRef.current, width: widthRef.current }
  }

  const clearCanvas = () => {
    if (!ctxRef.current || !canvasRef.current) return

    const ctx = ctxRef.current
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    strokesRef.current = []
  }

  const getImageData = (): string | null => {
    return canvasRef.current?.toDataURL('image/png') ?? null
  }

  const getStrokes = (): DrawingStroke[] => {
    return strokesRef.current
  }

  const setColor = (color: string) => {
    colorRef.current = color
  }

  const setWidth = (width: number) => {
    widthRef.current = Math.max(1, Math.min(20, width))
  }

  return {
    canvasRef,
    startStroke,
    drawStroke,
    endStroke,
    clearCanvas,
    getImageData,
    getStrokes,
    setColor,
    setWidth,
  }
}
