import { Stage, Layer, Text } from 'react-konva'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Konva from 'konva'
import { socketService } from './services/socket'
import { Leaderboard } from './components/Leaderboard'
import { NameModal } from './components/NameModal'
import { FlagCell, RevealedCell, NumberCell, GridLine, PointerRect } from './components/Cell'

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
  const pointerPosRef = useRef(pointerPos)
  pointerPosRef.current = pointerPos
  const [isDraggingEnabled] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [flaggedCells, setFlaggedCells] = useState<Set<string>>(new Set())
  const [revealedCells, setRevealedCells] = useState<Map<string, { isMine: boolean; number: number }>>(new Map())
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [scorePopups, setScorePopups] = useState<Array<{ id: number; x: number; y: number; delta: number; opacity: number }>>([])
  const popupRefs = useRef<Map<number, Konva.Text>>(new Map())
  const [showNameModal, setShowNameModal] = useState(false)
  const [fps, setFps] = useState(0)
  const [showFps, setShowFps] = useState(true)
  const [fpsPos, setFpsPos] = useState({ x: 10, y: 10 })
  const [gridLines] = useState<React.ReactNode[]>(() => {
    const lines: React.ReactNode[] = []
    const gridWidth = COLS * CELL_SIZE
    const gridHeight = ROWS * CELL_SIZE

    for (let i = 0; i <= COLS; i++) {
      const x = i * CELL_SIZE
      lines.push(<GridLine key={`v-${i}`} x1={x} y1={0} x2={x} y2={gridHeight} />)
    }
    for (let i = 0; i <= ROWS; i++) {
      const y = i * CELL_SIZE
      lines.push(<GridLine key={`h-${i}`} x1={0} y1={y} x2={gridWidth} y2={y} />)
    }
    return lines
  })

  useEffect(() => {
    const anim = new Konva.Animation((frame) => {
      if (showFps) {
        setFps(frame.frameRate);
      }
      const stage = stageRef.current;
      if (stage) {
        setFpsPos({ x: -stage.x() + 10, y: -stage.y() + 10 });
      }
    }, stageRef.current?.getLayers()[0]?.getLayer());

    anim.start();
    return () => { anim.stop(); };
  }, [showFps]);

  const cellKey = (col: number, row: number) => `${col},${row}`

  const handleNameSubmit = (name: string) => {
    socketService.setPlayerName(name);
    socketService.setName(name);
    setShowNameModal(false);
  };

  const handleEditName = () => {
    setShowNameModal(true);
  };

  const toggleFps = () => {
    setShowFps((prev) => !prev);
  };

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

      if (!socketService.hasPlayerName()) {
        setShowNameModal(true);
      }
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

    let prevScore = 0;
    socketService.onScoreUpdate((data) => {
      const delta = data.score - prevScore;
      prevScore = data.score;
      const pos = pointerPosRef.current;
      if (delta !== 0 && pos) {
        const id = Date.now();
        setScorePopups((prev) => [...prev, { id, x: pos.x, y: pos.y, delta, opacity: 1 }]);
        setTimeout(() => {
          const node = popupRefs.current.get(id);
          if (node) {
            new Konva.Tween({
              node,
              duration: 0.5,
              opacity: 0,
              y: node.y() - 30,
              easing: Konva.Easings.EaseOut,
              onFinish: () => {
                setScorePopups((prev) => prev.filter((p) => p.id !== id));
                popupRefs.current.delete(id);
              },
            }).play();
          } else {
            setScorePopups((prev) => prev.filter((p) => p.id !== id));
          }
        }, 500);
      }
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

  const flaggedRects = Array.from(flaggedCells).map((key) => {
    const [col, row] = key.split(',').map(Number)
    return <FlagCell key={key} col={col} row={row} cellSize={CELL_SIZE} />
  })

  const revealedRects = Array.from(revealedCells.entries()).map(([key, cell]) => {
    const [col, row] = key.split(',').map(Number)
    return <RevealedCell key={key} col={col} row={row} cellSize={CELL_SIZE} isMine={cell.isMine} />
  })

  const revealedNumbers = Array.from(revealedCells.entries()).map(([key, cell]) => {
    const [col, row] = key.split(',').map(Number)
    return <NumberCell key={`num-${key}`} col={col} row={row} cellSize={CELL_SIZE} number={cell.number} />
  })

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'black' }}>
      <Leaderboard onEditName={handleEditName} />
      <NameModal
        isOpen={showNameModal}
        onSubmit={handleNameSubmit}
        initialName={socketService.getPlayerName()}
      />
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        draggable={isDraggingEnabled}
        style={{ cursor: isDragging ? 'grab' : 'default' }}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
      >
        <Layer listening={false}>
          {gridLines}
          {flaggedRects}
          {revealedRects}
          {revealedNumbers}
        </Layer>
        <Layer listening={false} imageSmoothingEnabled={false}>
          {pointerPos && (
            <PointerRect x={pointerPos.x} y={pointerPos.y} cellSize={CELL_SIZE} />
          )}
          {scorePopups.map((popup) => (
            <Text
              key={popup.id}
              ref={(node) => {
                if (node) popupRefs.current.set(popup.id, node);
              }}
              x={popup.x}
              y={popup.y}
              text={popup.delta > 0 ? `+${popup.delta}` : `${popup.delta}`}
              fontSize={20}
              fontStyle="bold"
              fill={popup.delta > 0 ? '#4f4' : '#f44'}
              opacity={popup.opacity}
            />
          ))}
        </Layer>
        <Layer>
          {showFps && (
            <Text
              x={fpsPos.x}
              y={fpsPos.y}
              text={`FPS: ${fps.toFixed(1)}`}
              fontSize={16}
              fill="#fff"
              onClick={toggleFps}
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