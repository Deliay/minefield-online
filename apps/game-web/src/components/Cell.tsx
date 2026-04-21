import { memo, useRef, useEffect } from 'react'
import { Rect, Text, Line } from 'react-konva'

interface FlagCellProps {
  col: number
  row: number
  cellSize: number
}

export const FlagCell = memo(function FlagCell({ col, row, cellSize }: FlagCellProps) {
  const ref = useRef<any>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.cache()
    }
  }, [])
  return (
    <Text
      ref={ref}
      id={`${col}-${row}`}
      key={`${col}-${row}`}
      x={col * cellSize}
      y={row * cellSize}
      width={cellSize}
      height={cellSize}
      text="🚩"
      fontSize={24}
      align="center"
      verticalAlign="middle"
      perfectDrawEnabled={false}
    />
  )
})

interface RevealedCellProps {
  col: number
  row: number
  cellSize: number
  isMine: boolean
}

export const RevealedCell = memo(function RevealedCell({ col, row, cellSize, isMine }: RevealedCellProps) {
  const ref = useRef<any>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.cache()
    }
  }, [])
  return (
    <Rect
      ref={ref}
      id={`${col}-${row}`}
      key={`${col}-${row}`}
      x={col * cellSize}
      y={row * cellSize}
      width={cellSize}
      height={cellSize}
      fill={isMine ? '#ff0000' : '#ccc'}
      perfectDrawEnabled={false}
    />
  )
})

interface NumberCellProps {
  col: number
  row: number
  cellSize: number
  number: number
}

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

export const NumberCell = memo(function NumberCell({ col, row, cellSize, number }: NumberCellProps) {
  const ref = useRef<any>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.cache()
    }
  }, [])
  if (number === 0) return null
  return (
    <Text
      ref={ref}
      id={`${col}-${row}`}
      key={`${col}-${row}`}
      x={col * cellSize}
      y={row * cellSize}
      width={cellSize}
      height={cellSize}
      text={String(number)}
      fontSize={20}
      fontStyle="bold"
      fill={numberColors[number] || '#000'}
      align="center"
      verticalAlign="middle"
      perfectDrawEnabled={false}
    />
  )
})

interface GridLineProps {
  x1: number
  y1: number
  x2: number
  y2: number
}

export const GridLine = memo(function GridLine({ x1, y1, x2, y2 }: GridLineProps) {
  return <Line points={[x1, y1, x2, y2]} stroke="#333" strokeWidth={2} perfectDrawEnabled={false} />
})

interface PointerRectProps {
  x: number
  y: number
  cellSize: number
}

export const PointerRect = memo(function PointerRect({ x, y, cellSize }: PointerRectProps) {
  return (
    <Rect
      key={"pointer"}
      x={x}
      y={y}
      width={cellSize}
      height={cellSize}
      fill="rgba(128, 128, 128, 0.5)"
      stroke="#fff"
      strokeWidth={2}
      perfectDrawEnabled={false}
    />
  )
})