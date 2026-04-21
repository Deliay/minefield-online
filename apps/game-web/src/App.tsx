import { Stage, Layer, Rect, Line, Text } from 'react-konva'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Konva from 'konva'
import { socketService } from './services/socket'
import { Leaderboard } from './components/Leaderboard'

const CELL_SIZE = 40
const COLS = 1200
const ROWS = 640
const MINIMAP_WIDTH = 200
const MINIMAP_HEIGHT = Math.floor(ROWS * (MINIMAP_WIDTH / COLS))

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight })
  const stageRef = useRef<Konva.Stage>(null)
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null)
  const [isDraggingEnabled] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [flaggedCells, setFlaggedCells] = useState<Set<string>>(new Set())
  const [revealedCells, setRevealedCells] = useState<Map<string, { isMine: boolean; number: number }>>(new Map())
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })

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
      setStagePos(stage.position())
    }
  }, [dimensions.width, dimensions.height])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const handleDragStart = () => setIsDragging(true)
    const handleDragEnd = () => {
      setIsDragging(false)
      setStagePos(stage.position())
    }
    stage.on('dragstart', handleDragStart)
    stage.on('dragend', handleDragEnd)
    return () => {
      stage.off('dragstart', handleDragStart)
      stage.off('dragend', handleDragEnd)
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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
          const revealed = revealedCells.get(key)
          if (revealed && !revealed.isMine && revealed.number > 0) {
            socketService.chord(col, row)
          } else if (!revealedCells.has(key) && !flaggedCells.has(key)) {
            socketService.reveal(col, row)
          }
        }
      }
    },
    [revealedCells, flaggedCells]
  )

  const scaleX = MINIMAP_WIDTH / (COLS * CELL_SIZE)
  const scaleY = MINIMAP_HEIGHT / (ROWS * CELL_SIZE)

  const viewportRect = useMemo(() => {
    const stageX = -stagePos.x
    const stageY = -stagePos.y
    return {
      x: stageX * scaleX,
      y: stageY * scaleY,
      width: dimensions.width * scaleX,
      height: dimensions.height * scaleY,
    }
  }, [stagePos, dimensions, scaleX, scaleY])

  const handleMinimapClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const stage = stageRef.current
      if (!stage) return
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top
      const gridX = clickX / scaleX
      const gridY = clickY / scaleY
      const newStageX = -(gridX - dimensions.width / 2)
      const newStageY = -(gridY - dimensions.height / 2)
      stage.position({ x: newStageX, y: newStageY })
      setStagePos({ x: newStageX, y: newStageY })
    },
    [scaleX, scaleY, dimensions]
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
      <Leaderboard />
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable={isDraggingEnabled}
        style={{ cursor: isDragging ? 'grab' : 'pointer' }}
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
      <button
        type="button"
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          width: MINIMAP_WIDTH,
          height: MINIMAP_HEIGHT,
          backgroundColor: '#222',
          border: '2px solid #555',
          cursor: 'pointer',
          padding: 0,
        }}
        onClick={handleMinimapClick}
        aria-label="Minimap navigation"
      >
        {Array.from(revealedCells.entries()).map(([key, cell]) => {
          const [col, row] = key.split(',').map(Number)
          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                left: col * CELL_SIZE * scaleX,
                top: row * CELL_SIZE * scaleY,
                width: Math.max(1, CELL_SIZE * scaleX),
                height: Math.max(1, CELL_SIZE * scaleY),
                backgroundColor: cell.isMine ? '#ff0000' : '#ccc',
              }}
            />
          )
        })}
        <div
          style={{
            position: 'absolute',
            left: viewportRect.x,
            top: viewportRect.y,
            width: viewportRect.width,
            height: viewportRect.height,
            border: '2px solid #fff',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            boxSizing: 'border-box',
          }}
        />
      </button>
    </div>
  )
}

export default App