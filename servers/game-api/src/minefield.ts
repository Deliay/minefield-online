export const CELL_SIZE = 40;
export const COLS = 1200;
export const ROWS = 640;
export const CHUNK_COLS = 30;
export const CHUNK_ROWS = 16;
export const CHUNK_MINES = 99;

const TOTAL_CHUNKS_X = COLS / CHUNK_COLS;
const TOTAL_CHUNKS_Y = ROWS / CHUNK_ROWS;

interface Cell {
  isMine: boolean;
  number: number;
}

class Minefield {
  private cells: Cell[][];

  constructor() {
    this.cells = [];
    this.generate();
  }

  private generate(): void {
    for (let row = 0; row < ROWS; row++) {
      this.cells[row] = [];
      for (let col = 0; col < COLS; col++) {
        this.cells[row][col] = { isMine: false, number: 0 };
      }
    }

    for (let chunkY = 0; chunkY < TOTAL_CHUNKS_Y; chunkY++) {
      for (let chunkX = 0; chunkX < TOTAL_CHUNKS_X; chunkX++) {
        this.placeChunkMines(chunkX, chunkY);
      }
    }

    this.calculateNumbers();
  }

  private placeChunkMines(chunkX: number, chunkY: number): void {
    const startCol = chunkX * CHUNK_COLS;
    const startRow = chunkY * CHUNK_ROWS;
    const endCol = startCol + CHUNK_COLS;
    const endRow = startRow + CHUNK_ROWS;

    const positions: { col: number; row: number }[] = [];
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        positions.push({ col, row });
      }
    }

    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    for (let i = 0; i < CHUNK_MINES; i++) {
      const { col, row } = positions[i];
      this.cells[row][col].isMine = true;
    }
  }

  private calculateNumbers(): void {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (this.cells[row][col].isMine) continue;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = row + dy;
            const nx = col + dx;
            if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
              if (this.cells[ny][nx].isMine) count++;
            }
          }
        }
        this.cells[row][col].number = count;
      }
    }
  }

  getCell(col: number, row: number): Cell | null {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return this.cells[row][col];
  }

  getChunk(chunkX: number, chunkY: number): Cell[][] {
    const startCol = chunkX * CHUNK_COLS;
    const startRow = chunkY * CHUNK_ROWS;
    const chunk: Cell[][] = [];
    for (let row = startRow; row < startRow + CHUNK_ROWS; row++) {
      const rowData: Cell[] = [];
      for (let col = startCol; col < startCol + CHUNK_COLS; col++) {
        rowData.push(this.cells[row][col]);
      }
      chunk.push(rowData);
    }
    return chunk;
  }
}

const minefield = new Minefield();

export default minefield;