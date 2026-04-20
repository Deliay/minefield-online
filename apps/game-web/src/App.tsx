import { Stage, Layer, Rect, Line, Text } from 'react-konva'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Konva from 'konva'
import { socketService } from './services/socket'

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
  const [revealedCells, setRevealedCells] = useState<Map<string, { isMine: boolean; number: number }>>(new Map())

  const cellKey = (col: number, row: number) => `${col},${row}`

  useEffect(() => {
    socketService.connect();

    socketService.onInit((data) => {
      const newRevealed = new Map<string, { isMine: boolean; number: number }>();
      for (const cell of data.revealed) {
        newRevealed.set(cellKey(cell.col, cell.row), { isMine: cell.isMine, number: cell.number });
      }
      setRevealedCells(newRevealed);

      const newFlagged = new Set<string>();
      for (const { col, row } of data.flagged) {
        newFlagged.add(cellKey(col, row));
      }
      setFlaggedCells(newFlagged);
    });

    socketService.onCellRevealed((data) => {
      setRevealedCells((prev) => {
        const next = new Map(prev);
        for (const cell of data.cells) {
          next.set(cellKey(cell.col, cell.row), { isMine: cell.isMine, number: cell.number });
        }
        return next;
      });
    });

    socketService.onCellFlagged((data) => {
      setFlaggedCells((prev) => {
        const next = new Set(prev);
        const key = cellKey(data.col, data.row);
        if (data.isFlagged) {
          next.add(key);
        } else {
          next.delete(key);
        }
        return next;
      });
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

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
  }, [dimensions.width, dimensions.height])

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
          socketService.flag(col, row)
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
            socketService.reveal(col, row)
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
    gridLines.push(<Line key={`v-${i}`} points={[x, 0, x, gridHeight]} stroke="#333" strokeWidth={2} />)
  }
  for (let i = 0; i <= ROWS; i++) {
    const y = i * CELL_SIZE
    gridLines.push(<Line key={`h-${i}`} points={[0, y, gridWidth, y]} stroke="#333" strokeWidth={2} />)
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
    return Array.from(revealedCells.entries()).map(([key, cell]) => {
      const [col, row] = key.split(',').map(Number)
      return (
        <Rect
          key={key}
          x={col * CELL_SIZE}
          y={row * CELL_SIZE}
          width={CELL_SIZE}
          height={CELL_SIZE}
          fill={cell.isMine ? '#ff0000' : '#ccc'}
        />
      )
    })
  }, [revealedCells])

  const numberColors: Record<number, string> = {
    1: '#0000FF',
    2: '#008000',
    3: '#FF0000',
    4: '#000080',
    5: '#800000',
    6: '#008080',
    7: '#000000',
    8: '#808080',
  }

  const revealedNumbers = useMemo(() => {
    return Array.from(revealedCells.entries()).map(([key, cell]) => {
      const [col, row] = key.split(',').map(Number)
      if (cell.isMine || cell.number === 0) return null
      return (
        <Text
          key={`num-${key}`}
          x={col * CELL_SIZE}
          y={row * CELL_SIZE}
          width={CELL_SIZE}
          height={CELL_SIZE}
          text={String(cell.number)}
          fontSize={20}
          fontStyle="bold"
          fill={numberColors[cell.number] || '#000'}
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