import { Stage, Layer, Rect, Line, Text } from 'react-konva'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Konva from 'konva'

const CELL_SIZE = 40
const COLS = 1200
const ROWS = 640

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight })
  const stageRef = useRef<Konva.Stage>(null)
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null)
  const [isDraggingEnabled, setIsDraggingEnabled] = useState(false)
  const [flaggedCells, setFlaggedCells] = useState<Set<string>>(new Set())
  const [revealedCells, setRevealedCells] = useState<Map<string, number>>(new Map())
  const cellNumberCache = useRef<Map<string, number>>(new Map())

  const cellKey = (col: number, row: number) => `${col},${row}`
  const toggleFlag = (col: number, row: number) => {
    const key = cellKey(col, row)
    setFlaggedCells((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  useEffect(() => {
    const stage = stageRef.current
    if (stage) {
      const gridWidth = COLS * CELL_SIZE
      const gridHeight = ROWS * CELL_SIZE
      stage.position({
        x: -(gridWidth - dimensions.width) / 2,
        y: -(gridHeight - dimensions.height) / 2,
      })
    }
  }, [])

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

  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.evt.preventDefault()
      const stage = stageRef.current
      if (!stage) return
      const pos = stage.getPointerPosition()
      const stagePos = stage.absolutePosition()
      if (pos) {
        const absX = pos.x - stagePos.x
        const absY = pos.y - stagePos.y
        const col = Math.floor(absX / CELL_SIZE)
        const row = Math.floor(absY / CELL_SIZE)
        if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
          toggleFlag(col, row)
        }
      }
    },
    []
  )

  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button !== 0) return
      const stage = stageRef.current
      if (!stage) return
      const pos = stage.getPointerPosition()
      const stagePos = stage.absolutePosition()
      if (pos) {
        const absX = pos.x - stagePos.x
        const absY = pos.y - stagePos.y
        const col = Math.floor(absX / CELL_SIZE)
        const row = Math.floor(absY / CELL_SIZE)
        if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
          const key = cellKey(col, row)
          if (!revealedCells.has(key) && !flaggedCells.has(key)) {
            let num: number
            if (cellNumberCache.current.has(key)) {
              num = cellNumberCache.current.get(key)!
            } else {
              num = Math.floor(Math.random() * 8) + 1
              cellNumberCache.current.set(key, num)
            }
            setRevealedCells((prev) => {
              const next = new Map(prev)
              next.set(key, num)
              return next
            })
          }
        }
      }
    },
    [revealedCells, flaggedCells]
  )

  const gridLines: React.ReactNode[] = []
  const gridWidth = COLS * CELL_SIZE
  const gridHeight = ROWS * CELL_SIZE

  for (let i = 0; i <= COLS; i++) {
    const x = i * CELL_SIZE
    gridLines.push(<Line key={`v-${i}`} points={[x, 0, x, gridHeight]} stroke="#333" strokeWidth={1} />)
  }
  for (let i = 0; i <= ROWS; i++) {
    const y = i * CELL_SIZE
    gridLines.push(<Line key={`h-${i}`} points={[0, y, gridWidth, y]} stroke="#333" strokeWidth={1} />)
  }

  const flaggedRects = useMemo(() => {
    return Array.from(flaggedCells).map((key) => {
      const [col, row] = key.split(',').map(Number)
      return (
        <Text
          key={key}
          x={col * CELL_SIZE}
          y={row * CELL_SIZE}
          width={CELL_SIZE}
          height={CELL_SIZE}
          text="🚩"
          fontSize={24}
          align="center"
          verticalAlign="middle"
        />
      )
    })
  }, [flaggedCells])

  const revealedRects = useMemo(() => {
    return Array.from(revealedCells.keys()).map((key) => {
      const [col, row] = key.split(',').map(Number)
      return (
        <Rect
          key={key}
          x={col * CELL_SIZE}
          y={row * CELL_SIZE}
          width={CELL_SIZE}
          height={CELL_SIZE}
          fill="#ccc"
        />
      )
    })
  }, [revealedCells])

  const revealedNumbers = useMemo(() => {
    return Array.from(revealedCells.entries()).map(([key, num]) => {
      const [col, row] = key.split(',').map(Number)
      return (
        <Text
          key={`num-${key}`}
          x={col * CELL_SIZE}
          y={row * CELL_SIZE}
          width={CELL_SIZE}
          height={CELL_SIZE}
          text={String(num)}
          fontSize={20}
          fontStyle="bold"
          fill="#000"
          align="center"
          verticalAlign="middle"
        />
      )
    })
  }, [revealedCells])

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'black' }}>
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable={isDraggingEnabled}
        style={{ cursor: isDraggingEnabled ? 'grab' : 'default' }}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
      >
        <Layer>
          {gridLines}
          {flaggedRects}
          {revealedRects}
          {revealedNumbers}
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