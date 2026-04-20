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
  isMine: boolean;
  number: number;
}

interface GameState {
  revealed: Map<string, RevealedCell>;
  flagged: Set<string>;
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
    return this.gameState.revealed.has(this.cellKey(col, row));
  }

  isFlagged(col: number, row: number): boolean {
    return this.gameState.flagged.has(this.cellKey(col, row));
  }

  reveal(col: number, row: number): RevealedCell[] {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return [];
    const key = this.cellKey(col, row);
    if (this.isRevealed(col, row) || this.isFlagged(col, row)) return [];

    const cell = this.cells[row][col];
    const results: RevealedCell[] = [];

    if (cell.isMine) {
      this.gameState.revealed.set(key, { isMine: true, number: 0 });
      results.push({ isMine: true, number: 0 });
      return results;
    }

    const queue: { col: number; row: number }[] = [{ col, row }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { col: c, row: r } = queue.shift()!;
      const k = this.cellKey(c, r);
      if (visited.has(k)) continue;
      visited.add(k);

      const currentCell = this.cells[r][c];
      this.gameState.revealed.set(k, { isMine: false, number: currentCell.number });
      results.push({ isMine: false, number: currentCell.number });

      if (currentCell.number === 0) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = r + dy;
            const nx = c + dx;
            if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
              const nk = this.cellKey(nx, ny);
              if (!visited.has(nk) && !this.isRevealed(nx, ny) && !this.isFlagged(nx, ny) && !this.cells[ny][nx].isMine) {
                queue.push({ col: nx, row: ny });
              }
            }
          }
        }
      }
    }

    return results;
  }

  flag(col: number, row: number): boolean {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    if (this.isRevealed(col, row)) return false;
    const key = this.cellKey(col, row);
    if (this.gameState.flagged.has(key)) {
      this.gameState.flagged.delete(key);
      return false;
    } else {
      this.gameState.flagged.add(key);
      return true;
    }
  }

  getAllRevealed(): Array<{ col: number; row: number; cell: RevealedCell }> {
    const results: Array<{ col: number; row: number; cell: RevealedCell }> = [];
    for (const [key, cell] of this.gameState.revealed) {
      const [col, row] = key.split(',').map(Number);
      results.push({ col, row, cell });
    }
    return results;
  }

  getAllFlagged(): Array<{ col: number; row: number }> {
    const results: Array<{ col: number; row: number }> = [];
    for (const key of this.gameState.flagged) {
      const [col, row] = key.split(',').map(Number);
      results.push({ col, row });
    }
    return results;
  }
}

const minefield = new Minefield();

export default minefield;