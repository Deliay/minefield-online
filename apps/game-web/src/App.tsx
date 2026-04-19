import { Stage, Layer } from 'react-konva'
import { useEffect, useRef, useState } from 'react'
import Konva from 'konva'
import Cell from './components/Cell'

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight })
  const stageRef = useRef<Konva.Stage>(null)

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'black' }}>
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable
        style={{ cursor: 'grab' }}
      >
        <Layer>
          <Cell x={0} y={0} />
          <Cell x={40} y={0} />
          <Cell x={80} y={0} />
        </Layer>
      </Stage>
    </div>
  )
}

export default App