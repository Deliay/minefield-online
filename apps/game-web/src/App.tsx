import { Stage, Layer, Rect, Line } from 'react-konva'
import { useEffect, useRef, useState, useCallback } from 'react'
import Konva from 'konva'

const CELL_SIZE = 40

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight })
  const stageRef = useRef<Konva.Stage>(null)
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null)
  const [isDraggingEnabled, setIsDraggingEnabled] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Alt') {
        setIsDraggingEnabled(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Alt') {
        setIsDraggingEnabled(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const handleMouseMove = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const pos = stage.getPointerPosition()
    const stagePos = stage.absolutePosition()
    if (pos) {
      const absX = pos.x - stagePos.x
      const absY = pos.y - stagePos.y
      const snappedX = Math.floor(absX / CELL_SIZE) * CELL_SIZE
      const snappedY = Math.floor(absY / CELL_SIZE) * CELL_SIZE
      setPointerPos({ x: snappedX, y: snappedY })
    }
  }, [])

  const gridLines: React.ReactNode[] = []
  const cols = Math.ceil(dimensions.width / CELL_SIZE) + 1
  const rows = Math.ceil(dimensions.height / CELL_SIZE) + 1

  for (let i = 0; i <= cols; i++) {
    const x = i * CELL_SIZE
    gridLines.push(<Line key={`v-${i}`} points={[x, 0, x, dimensions.height]} stroke="#333" strokeWidth={1} />)
  }
  for (let i = 0; i <= rows; i++) {
    const y = i * CELL_SIZE
    gridLines.push(<Line key={`h-${i}`} points={[0, y, dimensions.width, y]} stroke="#333" strokeWidth={1} />)
  }

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'black' }}>
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable={isDraggingEnabled}
        style={{ cursor: isDraggingEnabled ? 'grab' : 'default' }}
        onMouseMove={handleMouseMove}
      >
        <Layer>
          {gridLines}
          {pointerPos && (
            <Rect
              x={pointerPos.x}
              y={pointerPos.y}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill="rgba(128, 128, 128, 0.5)"
              stroke="#fff"
              strokeWidth={2}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

export default App