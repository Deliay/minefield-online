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

interface RevealedCell {
  col: number;
  row: number;
  isMine: boolean;
  number: number;
}

interface GameState {
  revealed: Map<number, { isMine: boolean; number: number }>;
  flagged: Set<number>;
}

export class Minefield {
  private cells: Cell[][];
  private gameState: GameState;

  constructor() {
    this.cells = [];
    this.gameState = {
      revealed: new Map(),
      flagged: new Set(),
    };
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

  private cellKey(col: number, row: number): string {
    return `${col},${row}`;
  }

  isRevealed(col: number, row: number): boolean {
    return this.gameState.revealed.has(col * ROWS + row);
  }

  isFlagged(col: number, row: number): boolean {
    return this.gameState.flagged.has(col * ROWS + row);
  }

  reveal(col: number, row: number): RevealedCell[] {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return [];
    const idx = col * ROWS + row;
    if (this.gameState.revealed.has(idx) || this.gameState.flagged.has(idx)) return [];

    const cell = this.cells[row][col];
    const results: RevealedCell[] = [];

    if (cell.isMine) {
      this.gameState.revealed.set(idx, { isMine: true, number: 0 });
      results.push({ col, row, isMine: true, number: 0 });
      return results;
    }

    const queue: number[] = [];
    const visited = new Set<number>();
    const { revealed, flagged } = this.gameState;

    const addToQueue = (c: number, r: number) => {
      const nIdx = c * ROWS + r;
      if (visited.has(nIdx) || revealed.has(nIdx) || flagged.has(nIdx)) return;
      if (this.cells[r][c].isMine) return;
      queue.push(nIdx);
    };

    const expandCell = (c: number, r: number): boolean => {
      const cellIdx = c * ROWS + r;
      if (visited.has(cellIdx)) return false;
      const cCell = this.cells[r][c];
      if (cCell.isMine) return false;
      visited.add(cellIdx);
      revealed.set(cellIdx, { isMine: false, number: cCell.number });
      results.push({ col: c, row: r, isMine: false, number: cCell.number });
      return cCell.number === 0;
    };

    if (cell.number === 0) {
      queue.push(idx);
    } else {
      expandCell(col, row);
      for (let dy = -1; dy <= 1; dy++) {
        const ny = row + dy;
        if (ny < 0 || ny >= ROWS) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = col + dx;
          if (nx < 0 || nx >= COLS) continue;
          if (this.cells[ny][nx].number === 0) {
            addToQueue(nx, ny);
          }
        }
      }
    }

    while (queue.length > 0) {
      const currentIdx = queue.pop()!;
      const r = currentIdx % ROWS;
      const c = Math.floor(currentIdx / ROWS);

      if (!expandCell(c, r)) continue;

      for (let dy = -1; dy <= 1; dy++) {
        const ny = r + dy;
        if (ny < 0 || ny >= ROWS) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = c + dx;
          if (nx < 0 || nx >= COLS) continue;
          addToQueue(nx, ny);
        }
      }
    }

    return results;
  }

  flag(col: number, row: number): boolean {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    const idx = col * ROWS + row;
    if (this.gameState.revealed.has(idx)) return false;
    if (this.gameState.flagged.has(idx)) {
      this.gameState.flagged.delete(idx);
      return false;
    } else {
      this.gameState.flagged.add(idx);
      return true;
    }
  }

  getAllRevealed(): RevealedCell[] {
    const results: RevealedCell[] = [];
    for (const [idx, cell] of this.gameState.revealed) {
      const row = idx % ROWS;
      const col = Math.floor(idx / ROWS);
      results.push({ col, row, isMine: cell.isMine, number: cell.number });
    }
    return results;
  }

  getAllFlagged(): Array<{ col: number; row: number }> {
    const results: Array<{ col: number; row: number }> = [];
    for (const idx of this.gameState.flagged) {
      const row = idx % ROWS;
      const col = Math.floor(idx / ROWS);
      results.push({ col, row });
    }
    return results;
  }

  reset(): void {
    this.gameState.revealed.clear();
    this.gameState.flagged.clear();
  }
}

const minefield = new Minefield();

export default minefield;