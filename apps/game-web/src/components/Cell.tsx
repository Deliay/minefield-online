import Konva from 'konva'
import { memo, useEffect, useRef, useState } from 'react'
import { Rect, Text, Line, Group } from 'react-konva'
import { numberColors } from '../styles/number-colors'
import { CELL_STYLES } from '../styles/cell-styles'

interface CellProps {
  col: number
  row: number
  cellSize: number
  type: 'flag' | 'revealed' | 'number' | 'unrevealed-bg'
  isMine?: boolean
  number?: number
}

export const Cell = memo(function Cell({ col, row, cellSize, type, isMine, number }: CellProps) {
  const x = col * cellSize
  const y = row * cellSize
  const id = `${col}-${row}`
  const flagRef = useRef<Konva.Text>(null);
  const rectRef = useRef<Konva.Rect>(null);
  const numRef = useRef<Konva.Text>(null);
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  useEffect(() => {
    if (flagRef.current) {
      flagRef.current.cache();
    }
    if (rectRef.current) {
      rectRef.current.cache();
    }
    if (numRef.current) {
      numRef.current.cache();
    }
  }, []);
  if (type === 'flag') {
    return (
      <Text
        ref={flagRef}
        id={id}
        x={x}
        y={y}
        width={cellSize}
        height={cellSize}
        text="🚩"
        fontSize={24}
        align="center"
        verticalAlign="middle"
        perfectDrawEnabled={false}
        listening={false} 
      />
    )
  }

  if (type === 'unrevealed-bg') {
    // 未揭开格子背景：冷淡风格渐变
    const currentFill = isPressed
      ? CELL_STYLES.press.fill
      : isHovered
        ? CELL_STYLES.hover.fill
        : CELL_STYLES.unrevealed.fillGradient[0]

    return (
      <Rect
        ref={rectRef}
        id={id}
        x={x}
        y={y}
        width={cellSize}
        height={cellSize}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: cellSize, y: cellSize }}
        fillLinearGradientColorStops={[0, currentFill, 1, CELL_STYLES.unrevealed.fillGradient[1]]}
        stroke={CELL_STYLES.unrevealed.stroke}
        strokeWidth={1}
        shadowColor={CELL_STYLES.unrevealed.shadow.color}
        shadowBlur={isPressed ? CELL_STYLES.press.shadowBlur : isHovered ? CELL_STYLES.hover.shadowBlur : CELL_STYLES.unrevealed.shadow.blur}
        shadowOffset={isPressed ? CELL_STYLES.press.shadowOffset : CELL_STYLES.unrevealed.shadow.offset}
        cornerRadius={CELL_STYLES.unrevealed.cornerRadius}
        perfectDrawEnabled={false}
        listening={true}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setIsPressed(false)
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
      />
    )
  }

  if (type === 'revealed') {
    if (isMine) {
      // 地雷格子：冷淡风格警示色
      return (
        <Group>
          <Rect
            ref={rectRef}
            id={id}
            x={x}
            y={y}
            width={cellSize}
            height={cellSize}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: cellSize, y: cellSize }}
            fillLinearGradientColorStops={[0, CELL_STYLES.mine.fillGradient[0], 1, CELL_STYLES.mine.fillGradient[1]]}
            stroke={CELL_STYLES.mine.stroke}
            strokeWidth={1}
            perfectDrawEnabled={false}
          />
          <Text
            id={id}
            x={x}
            y={y}
            width={cellSize}
            height={cellSize}
            text={CELL_STYLES.mine.icon}
            fontSize={20}
            align="center"
            verticalAlign="middle"
            perfectDrawEnabled={false}
            listening={false}
          />
        </Group>
      )
    }

    // 已揭开格子：冷灰白背景
    return (
      <Group>
        <Rect
          ref={rectRef}
          id={id}
          x={x}
          y={y}
          width={cellSize}
          height={cellSize}
          fill={CELL_STYLES.revealed.fill}
          stroke={CELL_STYLES.revealed.stroke}
          strokeWidth={1}
          shadowColor={CELL_STYLES.revealed.shadow.color}
          shadowBlur={CELL_STYLES.revealed.shadow.blur}
          shadowOffset={CELL_STYLES.revealed.shadow.offset}
          perfectDrawEnabled={false}
        />
        {typeof number !== 'undefined' && number > 0 ?
          <Text
            ref={numRef}
            id={id}
            x={x}
            y={y}
            width={cellSize}
            height={cellSize}
            text={String(number)}
            fontSize={22}
            fontFamily="Inter, sans-serif"
            fontStyle="bold"
            fill={numberColors[number] || '#4a5568'}
            align="center"
            verticalAlign="middle"
            shadowColor="rgba(0, 0, 0, 0.2)"
            shadowBlur={1}
            shadowOffset={{ x: 0, y: 1 }}
            perfectDrawEnabled={false}
            listening={false}
          /> : null}
      </Group>
    )
  }

  return null
})

interface GridLineProps {
  x1: number
  y1: number
  x2: number
  y2: number
}

export const GridLine = memo(function GridLine({ x1, y1, x2, y2 }: GridLineProps) {
  const lineRef = useRef<Konva.Line>(null);
  useEffect(() => {
    if (lineRef.current) {
      lineRef.current.cache();
    }
  }, []);
  return <Line key={`${x1}-${x2}-${y1}-${y2}`} listening={false} points={[x1, y1, x2, y2]} stroke="#333" strokeWidth={2} perfectDrawEnabled={false} />
})

interface PointerRectProps {
  x: number
  y: number
  cellSize: number
}

export const PointerRect = memo(function PointerRect({ x, y, cellSize }: PointerRectProps) {
  return (
    <Rect
      x={x}
      y={y}
      width={cellSize}
      height={cellSize}
      fill="rgba(128, 128, 128, 0.5)"
      stroke="#fff"
      strokeWidth={2}
      perfectDrawEnabled={false}
      listening={false} 
    />
  )
})