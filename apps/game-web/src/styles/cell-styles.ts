// 格子样式常量（冷淡风格）
export const CELL_STYLES = {
  unrevealed: {
    fillGradient: ['#3a4556', '#2d3748'],
    stroke: '#1e2a3a',
    shadow: { color: 'rgba(0, 0, 0, 0.3)', blur: 2, offset: { x: 1, y: 1 } },
    cornerRadius: 2,
  },
  revealed: {
    fill: '#e8ecf0',
    stroke: '#c8d0da',
    shadow: { color: 'rgba(0, 0, 0, 0.1)', blur: 1, offset: { x: 1, y: 1 } },
  },
  mine: {
    fillGradient: ['#90a4ae', '#78909c'],
    stroke: '#546e7a',
    icon: '💣',
  },
  hover: {
    fill: '#4a5a6a',
    shadowBlur: 4,
  },
  press: {
    fill: '#2a3a4a',
    shadowBlur: 1,
    shadowOffset: { x: 0, y: 0 },
  },
}