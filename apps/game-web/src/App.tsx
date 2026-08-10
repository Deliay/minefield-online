import { Stage, Text, Layer } from 'react-konva'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Konva from 'konva'
import { socketService } from './services/socket'
import type { User } from './services/socket'
import { getToken, clearToken } from './services/api'
import { Leaderboard } from './components/Leaderboard'
import { Login } from './pages/Login'
import { Cell, GridLine, PointerRect } from './components/Cell'
import { useImmer } from 'use-immer'

const CELL_SIZE = 40
const COLS = 1200
const ROWS = 640
const MINIMAP_WIDTH = 200
const MINIMAP_HEIGHT = Math.floor(ROWS * (MINIMAP_WIDTH / COLS))

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isAuthed, setIsAuthed] = useState<boolean>(() => Boolean(getToken()))
  const [kickNotice, setKickNotice] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight })
  const stageRef = useRef<Konva.Stage>(null)
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null)
  const pointerPosRef = useRef(pointerPos)
  const [isDragging, setIsDragging] = useState(false)
  const [flaggedCells, updateFlaggedCells] = useImmer<{ [x: string]: { col: number, row: number } }>({})
  const [revealedCells, updateRevealedCells] = useImmer<{ [x: string]: { col: number, row: number, isMine?: boolean; number?: number } }>({})
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [scorePopups, setScorePopups] = useState<Array<{ id: number; x: number; y: number; delta: number; opacity: number }>>([])
  const popupRefs = useRef<Map<number, Konva.Text>>(new Map())
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

  const flagCellNodes = useMemo(() => {
    const flagNodes: React.ReactNode[] = []
    for (const key of Object.keys(flaggedCells)) {
      const cell = flaggedCells[key];

      flagNodes.push(<Cell key={key} col={cell.col} row={cell.row} cellSize={CELL_SIZE} type='flag' />)
    }

    return flagNodes
  }, [flaggedCells])

  const revealedCellNodes = useMemo(() => {
    const revealed: React.ReactNode[] = []

    for (const key of Object.keys(revealedCells)) {
      const cell = revealedCells[key];

      revealed.push(<Cell
        key={key}
        col={cell.col}
        row={cell.row}
        cellSize={CELL_SIZE}
        type='revealed'
        isMine={cell.isMine}
        number={cell.number} />)
    }

    return revealed
  }, [revealedCells])

  const cellKey = (col: number, row: number) => `${col},${row}`
  const cellKeyObj = ({ col, row }: { col: number, row: number }) => `${col},${row}`

  useEffect(() => {
    if (!isAuthed) return;

    socketService.connect();

    socketService.onInit((data) => {
      setUser(data.user);
      updateRevealedCells((obj) => {
        for (const cell of data.revealed) {
          obj[cellKeyObj(cell)] = cell;
        }
      });

      updateFlaggedCells((obj) => {
        for (const flagData of data.flagged) {
          obj[cellKeyObj(flagData)] = flagData;
        }
      })
    });

    socketService.onCellRevealed((data) => {
      updateRevealedCells((prev) => {
        const key = cellKeyObj(data);
        if (Array.isArray(data.cells) && data.cells.length > 0) {
          for (const cell of data.cells) {
            const cellKey = cellKeyObj(cell);
            if (!prev[cellKey]) prev[cellKey] = cell
          }
        }
        if (!prev[key]) prev[key] = data
      });
    });

    socketService.onCellFlagged((data) => {
      updateFlaggedCells((prev) => {
        const key = cellKeyObj(data);
        if (!prev[key]) prev[key] = data
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

    socketService.onForceLogout(() => {
      clearToken();
      setUser(null);
      setIsAuthed(false);
      setKickNotice('账号已在其他位置登录');
    });

    socketService.onLoginRequired(() => {
      clearToken();
      setUser(null);
      setIsAuthed(false);
    });

    return () => {
      socketService.disconnect();
    };
  }, [isAuthed]);

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
          const revealed = revealedCells[key]
          const hasRevealed = !!revealed;
          if (hasRevealed && !revealed.isMine && Number(revealed.number) > 0) {
            socketService.chord(col, row)
          } else if (!hasRevealed && !flaggedCells[key]) {
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

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setIsAuthed(false);
  }

  const handleSetName = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameDraft.trim();
    if (!name || name.length > 20) return;
    socketService.setName(name);
    setNameDraft('');
  }

  if (!isAuthed) {
    return (
      <Login
        onAuthed={(u) => {
          setUser(u);
          setIsAuthed(true);
        }}
      />
    )
  }

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'black' }}>
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 10,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          background: 'rgba(0,0,0,0.8)',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: 8,
          fontFamily: 'monospace',
          fontSize: 14,
        }}
      >
        <span>{user ? `${user.displayName || user.username}（${user.username}）` : '...'}</span>
        <span style={{ color: '#4a4' }}>{user ? `Score: ${user.score}` : ''}</span>
        <form onSubmit={handleSetName} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <label htmlFor="set-name" style={{ display: 'none' }}>
            改名
          </label>
          <input
            id="set-name"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="改名 (≤20)"
            maxLength={20}
            style={{
              width: 120,
              padding: 4,
              borderRadius: 4,
              border: '1px solid #555',
              background: '#111',
              color: '#fff',
            }}
          />
          <button type="submit" style={{ padding: '4px 8px', cursor: 'pointer' }}>
            改名
          </button>
        </form>
        <button type="button" onClick={handleLogout} style={{ padding: '4px 8px', cursor: 'pointer' }}>
          登出
        </button>
      </div>

      {kickNotice && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            fontFamily: 'monospace',
          }}
        >
          <div style={{ background: '#1a1a1a', padding: 24, borderRadius: 10, textAlign: 'center' }}>
            <p>{kickNotice}</p>
            <button
              type="button"
              onClick={() => setKickNotice(null)}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              返回登录
            </button>
          </div>
        </div>
      )}

      <Leaderboard />
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable={true}
        style={{ cursor: isDragging ? 'grab' : 'default' }}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
      >
        <Layer listening={false}>
          {gridLines}
        </Layer>
        <Layer listening={false}>
          {flagCellNodes}
          {revealedCellNodes}
        </Layer>
        <Layer listening={false}>
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
        {Object.entries(revealedCells).map(([key, cell]) => {
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
