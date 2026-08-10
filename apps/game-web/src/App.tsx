import { Stage, Layer, Rect, Line, Text } from 'react-konva'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Konva from 'konva'
import { socketService } from './services/socket'
import type { User } from './services/socket'
import { getToken, clearToken } from './services/api'
import { Leaderboard } from './components/Leaderboard'
import { Login } from './pages/Login'

const CELL_SIZE = 40
const COLS = 1200
const ROWS = 640
const MINIMAP_WIDTH = 200
const MINIMAP_HEIGHT = Math.floor(ROWS * (MINIMAP_WIDTH / COLS))

const cellKey = (col: number, row: number) => `${col},${row}`

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

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isAuthed, setIsAuthed] = useState<boolean>(() => Boolean(getToken()))
  const [kickNotice, setKickNotice] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight })
  const stageRef = useRef<Konva.Stage>(null)
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null)
  const [isDraggingEnabled, setIsDraggingEnabled] = useState(false)
  const [flaggedCells, setFlaggedCells] = useState<Set<string>>(new Set())
  const [revealedCells, setRevealedCells] = useState<Map<string, { isMine: boolean; number: number }>>(new Map())
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!isAuthed) return;

    socketService.connect();

    socketService.onInit((data) => {
      setUser(data.user);
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
    const handleDragEnd = () => {
      setStagePos(stage.position())
    }
    stage.on('dragend', handleDragEnd)
    return () => {
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