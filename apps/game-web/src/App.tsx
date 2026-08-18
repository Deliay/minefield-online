import { Stage, Text, Layer } from 'react-konva'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Konva from 'konva'
import { socketService } from './services/socket'
import type { User, Ranking } from './services/socket'
import { getToken, clearToken } from './services/api'
import { Login } from './pages/Login'
import { Cell, GridLine, PointerRect } from './components/Cell'
import { GameLayout } from './components/GameLayout'
import { UserInfoCard } from './components/UserInfoCard'
import { LeaderboardPanel } from './components/LeaderboardPanel'
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
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; radius: number; opacity: number }>>([])
  const rippleRefs = useRef<Map<number, Konva.Ring>>(new Map())
  const [rankings, setRankings] = useState<Ranking[]>([])
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

  const unrevealedCellNodes = useMemo(() => {
    const unrevealed: React.ReactNode[] = []
    const gridWidth = COLS * CELL_SIZE
    const gridHeight = ROWS * CELL_SIZE

    // 创建未揭开格子的背景
    unrevealed.push(
      <Cell
        key="unrevealed-bg"
        col={0}
        row={0}
        cellSize={gridWidth}
        type="unrevealed-bg"
      />
    )

    return unrevealed
  }, [])

  const cellKey = useCallback((col: number, row: number) => `${col},${row}`, [])
  const cellKeyObj = useCallback(({ col, row }: { col: number, row: number }) => `${col},${row}`, [])

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

    socketService.onLeaderboard((data) => {
      setRankings(data.rankings);
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
  }, [isAuthed, cellKeyObj, updateFlaggedCells, updateRevealedCells]);

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
          // Create ripple effect
          const rippleId = Date.now()
          const rippleX = col * CELL_SIZE + CELL_SIZE / 2
          const rippleY = row * CELL_SIZE + CELL_SIZE / 2
          setRipples((prev) => [...prev, { id: rippleId, x: rippleX, y: rippleY, radius: 0, opacity: 1 }])
          
          setTimeout(() => {
            const rippleNode = rippleRefs.current.get(rippleId)
            if (rippleNode) {
              new Konva.Tween({
                node: rippleNode,
                duration: 0.4,
                innerRadius: CELL_SIZE,
                outerRadius: CELL_SIZE,
                opacity: 0,
                easing: Konva.Easings.EaseOut,
                onFinish: () => {
                  setRipples((prev) => prev.filter((r) => r.id !== rippleId))
                  rippleRefs.current.delete(rippleId)
                },
              }).play()
            } else {
              setRipples((prev) => prev.filter((r) => r.id !== rippleId))
            }
          }, 10)

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
    [revealedCells, flaggedCells, cellKey]
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

  const handleSetName = (name: string) => {
    if (!name || name.length > 20) return;
    socketService.setName(name);
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

  const sidebar = user ? (
    <>
      <UserInfoCard
        user={user}
        onSetName={handleSetName}
        onLogout={handleLogout}
      />
      <LeaderboardPanel
        rankings={rankings}
        currentUsername={user.username}
      />
    </>
  ) : undefined;

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <GameLayout sidebar={sidebar}>
        {kickNotice && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-overlay)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 10, textAlign: 'center' }}>
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
            {unrevealedCellNodes}
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
                fontSize={24}
                fontStyle="bold"
                fill={popup.delta > 0 ? '#10b981' : '#ef4444'}
                opacity={popup.opacity}
                shadowColor={popup.delta > 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}
                shadowBlur={8}
                shadowOffset={{ x: 0, y: 2 }}
              />
            ))}
            {ripples.map((ripple) => (
              <Konva.Ring
                key={ripple.id}
                ref={(node) => {
                  if (node) rippleRefs.current.set(ripple.id, node);
                }}
                x={ripple.x}
                y={ripple.y}
                innerRadius={0}
                outerRadius={0}
                fill="transparent"
                stroke="rgba(99, 102, 241, 0.6)"
                strokeWidth={2}
                opacity={ripple.opacity}
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
                  backgroundColor: cell.isMine ? '#90a4ae' : '#e8ecf0',
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
      </GameLayout>
    </div>
  )
}

export default App
