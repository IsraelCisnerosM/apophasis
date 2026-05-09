import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useEffect } from 'react'
import * as THREE from 'three'
import { dispatchDemoSurface } from '@/a2ui/demoSurface'
import { Backdrop } from '@/scene/Backdrop'
import { Blob } from '@/scene/Blob'
import { CanvasDrawer } from '@/components/CanvasDrawer'
import { CopilotKit } from '@copilotkit/react-core'
import { useStore } from '@/store'
import { Controls } from '@/ui/Controls'
import { ConversationSidebar } from '@/ui/ConversationSidebar'
import { ResultGallery } from '@/ui/ResultGallery'
import { SurfacePanel } from '@/ui/SurfacePanel'
import { Transcript } from '@/ui/Transcript'

export default function App() {
  const lite = useStore((s) => s.lite)
  const toggleLite = useStore((s) => s.toggleLite)
  const registerSurface = useStore((s) => s.registerSurface)
  const showCanvasDrawer = useStore((s) => s.showCanvasDrawer)
  const setShowCanvasDrawer = useStore((s) => s.setShowCanvasDrawer)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'l' || e.key === 'L') {
        const tag = (e.target as HTMLElement | null)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        toggleLite()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleLite])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requested = params.get('demoSurface')
    if (requested !== null) {
      // ?demoSurface — accepts 'basic' (default), 'music', 'gallery', 'mood'.
      const preset = (
        ['basic', 'music', 'gallery', 'mood'].includes(requested) ? requested : 'basic'
      ) as 'basic' | 'music' | 'gallery' | 'mood'
      const id = dispatchDemoSurface(preset)
      registerSurface(id)
    }
  }, [registerSurface])

  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <Canvas
        dpr={lite ? 1 : [1, 2]}
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        gl={{ antialias: !lite, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <color attach="background" args={['#06070a']} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} />

        <Backdrop />
        <Blob />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          rotateSpeed={0.6}
          autoRotate={!lite}
          autoRotateSpeed={0.4}
        />

        {!lite && (
          <EffectComposer>
            <Bloom mipmapBlur intensity={0.65} luminanceThreshold={0.5} luminanceSmoothing={0.3} />
            <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[0.0008, 0.0008]} />
          </EffectComposer>
        )}
      </Canvas>
      <Transcript />
      <ConversationSidebar />
      <ResultGallery />
      <SurfacePanel />
      <Controls />
      {showCanvasDrawer && (
        <CanvasDrawer
          onClose={() => setShowCanvasDrawer(false)}
          onInterpret={handleInterpret}
        />
      )}
    </CopilotKit>
  )

  async function handleInterpret(imageData: string) {
    try {
      // Usar Gemini para interpretar la imagen
      const { GoogleGenAI } = await import('@google/genai')
      const genAI = new GoogleGenAI(import.meta.env.VITE_GEMINI_API_KEY || '')
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      
      const result = await model.generateContent([
        'Describe detalladamente lo que ves en esta imagen dibujada a mano. Proporciona una descripción clara y específica para que se pueda generar una interfaz de usuario basada en ella.',
        {
          inlineData: {
            mimeType: 'image/png',
            data: imageData.split(',')[1]
          }
        }
      ])
      
      const description = result.response.text()
      console.log('Descripción del dibujo:', description)
      
      // Usar Gemini para generar componentes A2UI basados en la descripción
      const uiResult = await model.generateContent([
        `Basado en esta descripción de un dibujo: "${description}", genera un objeto JSON con componentes A2UI v0.9 para crear una interfaz de usuario que represente o permita interactuar con lo dibujado. Usa componentes como Column, Row, Card, Text, TextField, ChoicePicker, Slider, CheckBox, Button. El componente raíz debe tener id "root". Devuelve solo el JSON válido.`
      ])
      
      const uiJson = uiResult.response.text()
      console.log('UI generada:', uiJson)
      
      try {
        const components = JSON.parse(uiJson)
        // Usar A2UI para renderizar
        // Aquí necesitarías integrar con el processor de A2UI
        // Por simplicidad, mostrar un surface básico
        const surfaceId = `drawing_${Date.now()}`
        const id = dispatchDemoSurface('basic')
        registerSurface(id)
      } catch (e) {
        console.error('Error parseando UI:', e)
      }
      
    } catch (error) {
      console.error('Error interpretando dibujo:', error)
    }
    setShowCanvasDrawer(false)
  }
}
