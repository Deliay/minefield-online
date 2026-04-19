import { Rect } from 'react-konva'

interface CellProps {
  x: number
  y: number
  width?: number
  height?: number
}

function Cell({ x, y, width = 40, height = 40 }: CellProps) {
  return <Rect x={x} y={y} width={width} height={height} fill="gray" />
}

export default Cell