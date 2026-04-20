import { describe, it, expect, beforeEach } from 'vitest';
import * as minefieldModule from '../minefield.js';

const { COLS, ROWS, CHUNK_COLS, CHUNK_ROWS, CHUNK_MINES } = minefieldModule;
const Minefield = minefieldModule.Minefield;

describe('Minefield', () => {
  let minefield: InstanceType<typeof Minefield>;

  beforeEach(() => {
    minefield = new Minefield();
  });

  describe('grid dimensions', () => {
    it('should have correct total columns', () => {
      expect(COLS).toBe(1200);
    });

    it('should have correct total rows', () => {
      expect(ROWS).toBe(640);
    });

    it('should return null for out-of-bounds coordinates', () => {
      expect(minefield.getCell(-1, 0)).toBeNull();
      expect(minefield.getCell(0, -1)).toBeNull();
      expect(minefield.getCell(COLS, 0)).toBeNull();
      expect(minefield.getCell(0, ROWS)).toBeNull();
    });
  });

  describe('chunks', () => {
    it('should have correct chunk dimensions', () => {
      expect(CHUNK_COLS).toBe(30);
      expect(CHUNK_ROWS).toBe(16);
    });

    it('should have 99 mines per chunk', () => {
      expect(CHUNK_MINES).toBe(99);
    });

    it('should have 40 chunks in each direction', () => {
      const totalChunksX = COLS / CHUNK_COLS;
      const totalChunksY = ROWS / CHUNK_ROWS;
      expect(totalChunksX).toBe(40);
      expect(totalChunksY).toBe(40);
    });

    it('should return chunk with correct dimensions', () => {
      const chunk = minefield.getChunk(0, 0);
      expect(chunk).toHaveLength(CHUNK_ROWS);
      expect(chunk[0]).toHaveLength(CHUNK_COLS);
    });

    it('should return chunk at correct position', () => {
      const chunk = minefield.getChunk(1, 1);
      expect(chunk).toHaveLength(CHUNK_ROWS);
      expect(chunk[0]).toHaveLength(CHUNK_COLS);
    });
  });

  describe('cell numbers', () => {
    it('should have number 0 for cells with no adjacent mines', () => {
      let foundNonMine = false;
      for (let row = 0; row < ROWS && !foundNonMine; row++) {
        for (let col = 0; col < COLS && !foundNonMine; col++) {
          const cell = minefield.getCell(col, row);
          if (cell && !cell.isMine) {
            foundNonMine = true;
          }
        }
      }
      expect(foundNonMine).toBe(true);
    });

    it('should not count self as adjacent mine', () => {
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const cell = minefield.getCell(col, row);
          if (cell && cell.isMine) {
            expect(cell.number).toBe(0);
          }
        }
      }
    });

    it('should calculate correct number for cell with known neighbors', () => {
      for (let row = 1; row < ROWS - 1; row++) {
        for (let col = 1; col < COLS - 1; col++) {
          const cell = minefield.getCell(col, row);
          if (cell && !cell.isMine) {
            let adjacentMines = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const neighbor = minefield.getCell(col + dx, row + dy);
                if (neighbor && neighbor.isMine) adjacentMines++;
              }
            }
            expect(cell.number).toBe(adjacentMines);
          }
        }
      }
    });
  });

  describe('mine placement', () => {
    it('should place exactly 99 mines in each chunk', () => {
      for (let chunkY = 0; chunkY < ROWS / CHUNK_ROWS; chunkY++) {
        for (let chunkX = 0; chunkX < COLS / CHUNK_COLS; chunkX++) {
          let mineCount = 0;
          const startCol = chunkX * CHUNK_COLS;
          const startRow = chunkY * CHUNK_ROWS;

          for (let row = startRow; row < startRow + CHUNK_ROWS; row++) {
            for (let col = startCol; col < startCol + CHUNK_COLS; col++) {
              const cell = minefield.getCell(col, row);
              if (cell && cell.isMine) mineCount++;
            }
          }

          expect(mineCount).toBe(CHUNK_MINES);
        }
      }
    });
  });

  describe('performance', () => {
    it('should reveal 100 cells within 10ms each', () => {
      const cellPositions: { col: number; row: number }[] = [];
      for (let col = 50; col < 150 && cellPositions.length < 100; col += 3) {
        for (let row = 50; row < 150 && cellPositions.length < 100; row += 3) {
          const cell = minefield.getCell(col, row);
          if (cell && !cell.isMine) {
            cellPositions.push({ col, row });
          }
        }
      }

      expect(cellPositions.length).toBeGreaterThanOrEqual(100);

      const times: number[] = [];
      for (const { col, row } of cellPositions) {
        const start = performance.now();
        minefield.reveal(col, row);
        const duration = performance.now() - start;
        times.push(duration);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      expect(maxTime).toBeLessThan(10);
      expect(avgTime).toBeLessThan(5);
    });
  });
});