import Konva from 'konva'
import { memo, useEffect, useRef } from 'react'
import { Rect, Text, Line, Group } from 'react-konva'

interface CellProps {
  col: number
  row: number
  cellSize: number
  type: 'flag' | 'revealed' | 'number'
  isMine?: boolean
  number?: number
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

export const Cell = memo(function Cell({ col, row, cellSize, type, isMine, number }: CellProps) {
  const x = col * cellSize
  const y = row * cellSize
  const id = `${col}-${row}`
  const flagRef = useRef<Konva.Text>(null);
  const rectRef = useRef<Konva.Rect>(null);
  const numRef = useRef<Konva.Text>(null);
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

  if (type === 'revealed') {
    return (
      <Group>
        <Rect
          id={id}
          x={x}
          y={y}
          width={cellSize}
          height={cellSize}
          fill={isMine ? '#ff0000' : '#ccc'}
          perfectDrawEnabled={false}
        />
        {typeof number !== 'undefined' && number > 0 ?
          <Text
            id={id}
            x={x}
            y={y}
            width={cellSize}
            height={cellSize}
            text={String(number)}
            fontSize={20}
            fontStyle="bold"
            fill={numberColors[number] || '#000'}
            align="center"
            verticalAlign="middle"
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