import { describe, it, expect } from 'vitest';
import {
  NF_PER_MINE_SCORE,
  neighbors8,
  collectMineCluster,
  findSettleableCluster,
} from '../nfSettler.js';

describe('nfSettler', () => {
  describe('NF_PER_MINE_SCORE', () => {
    it('should be 10', () => {
      expect(NF_PER_MINE_SCORE).toBe(10);
    });
  });

  describe('neighbors8', () => {
    it('should return 8 neighbors for interior cell', () => {
      const neighbors = neighbors8(5, 5, 10, 10);
      expect(neighbors).toHaveLength(8);
    });

    it('should return 3 neighbors for corner cell', () => {
      const neighbors = neighbors8(0, 0, 10, 10);
      expect(neighbors).toHaveLength(3);
    });

    it('should return correct neighbors', () => {
      const neighbors = neighbors8(1, 1, 10, 10);
      const positions = neighbors.map((n) => `${n.col},${n.row}`).sort();
      expect(positions).toEqual([
        '0,0', '0,1', '0,2',
        '1,0',        '1,2',
        '2,0', '2,1', '2,2',
      ]);
    });
  });

  describe('collectMineCluster', () => {
    it('should collect single mine cluster', () => {
      const board = [
        [false, false, false],
        [false, true, false],
        [false, false, false],
      ].map((row) => row.map((isMine) => ({ isMine, number: 0 })));

      const settled = new Set<number>();

      const cluster = collectMineCluster(board, settled, 1, 1, 3, 3);
      expect(cluster).toEqual([{ col: 1, row: 1 }]);
    });

    it('should collect adjacent mines as cluster', () => {
      const board = [
        [false, false, false],
        [false, true, true],
        [false, false, false],
      ].map((row) => row.map((isMine) => ({ isMine, number: 0 })));

      const settled = new Set<number>();

      const cluster = collectMineCluster(board, settled, 1, 1, 3, 3);
      expect(cluster).toHaveLength(2);
      const positions = cluster!.map((m) => `${m.col},${m.row}`).sort();
      expect(positions).toEqual(['1,1', '2,1']);
    });

    it('should return null if seed is not a mine', () => {
      const board = [
        [false, false, false],
        [false, false, false],
        [false, false, false],
      ].map((row) => row.map((isMine) => ({ isMine, number: 0 })));

      const settled = new Set<number>();

      const cluster = collectMineCluster(board, settled, 1, 1, 3, 3);
      expect(cluster).toBeNull();
    });

    it('should return null if seed is already settled', () => {
      const board = [
        [false, false, false],
        [false, true, false],
        [false, false, false],
      ].map((row) => row.map((isMine) => ({ isMine, number: 0 })));

      const settled = new Set([1 * 3 + 1]);

      const cluster = collectMineCluster(board, settled, 1, 1, 3, 3);
      expect(cluster).toBeNull();
    });

    it('should collect cluster even if not all non-mine neighbors are revealed', () => {
      const board = [
        [false, false, false],
        [false, true, false],
        [false, false, false],
      ].map((row) => row.map((isMine) => ({ isMine, number: 0 })));

      const settled = new Set<number>();

      const cluster = collectMineCluster(board, settled, 1, 1, 3, 3);
      expect(cluster).toEqual([{ col: 1, row: 1 }]);
    });

    it('should collect cluster if all non-mine neighbors are revealed', () => {
      const board = [
        [false, false, false],
        [false, true, false],
        [false, false, false],
      ].map((row) => row.map((isMine) => ({ isMine, number: 0 })));

      const settled = new Set<number>();

      const cluster = collectMineCluster(board, settled, 1, 1, 3, 3);
      expect(cluster).toEqual([{ col: 1, row: 1 }]);
    });

    it('should handle cluster touching board edge', () => {
      const board = [
        [true, false],
        [false, false],
      ].map((row) => row.map((isMine) => ({ isMine, number: 0 })));

      const settled = new Set<number>();

      const cluster = collectMineCluster(board, settled, 0, 0, 2, 2);
      expect(cluster).toEqual([{ col: 0, row: 0 }]);
    });

    it('should not double count settled mines in cluster', () => {
      const board = [
        [false, false, false],
        [false, true, true],
        [false, false, false],
      ].map((row) => row.map((isMine) => ({ isMine, number: 0 })));

      const settled = new Set<number>([1 * 3 + 1]);

      const cluster = collectMineCluster(board, settled, 2, 1, 3, 3);
      expect(cluster).toEqual([{ col: 2, row: 1 }]);
    });
  });

  describe('findSettleableCluster', () => {
    it('should return settle result for settleable cluster', () => {
      const board = [
        [false, false, false],
        [false, true, false],
        [false, false, false],
      ].map((row) => row.map((isMine) => ({ isMine, number: 0 })));

      const revealed = new Set<number>([
        0, 1, 2,
        3,    5,
        6, 7, 8,
      ]);
      const settled = new Set<number>();

      const result = findSettleableCluster(board, revealed, settled, 3, 3, 1, 1);
      expect(result).toEqual({
        mines: [{ col: 1, row: 1 }],
        delta: 10,
      });
    });

    it('should return null for non-settleable cluster', () => {
      const board = [
        [false, false, false],
        [false, true, false],
        [false, false, false],
      ].map((row) => row.map((isMine) => ({ isMine, number: 0 })));

      const revealed = new Set<number>();
      const settled = new Set<number>();

      const result = findSettleableCluster(board, revealed, settled, 3, 3, 1, 1);
      expect(result).toBeNull();
    });

    it('should calculate correct delta for multiple mines', () => {
      const board = [
        [false, false, false],
        [false, true, true],
        [false, false, false],
      ].map((row) => row.map((isMine) => ({ isMine, number: 0 })));

      const revealed = new Set<number>([
        0, 1, 2,
        3,    5,
        6, 7, 8,
      ]);
      const settled = new Set<number>();

      const result = findSettleableCluster(board, revealed, settled, 3, 3, 1, 1);
      expect(result).toEqual({
        mines: expect.arrayContaining([
          { col: 1, row: 1 },
          { col: 2, row: 1 },
        ]),
        delta: 20,
      });
    });

    it('should not settle already settled mines', () => {
      const board = [
        [false, false, false],
        [false, true, true],
        [false, false, false],
      ].map((row) => row.map((isMine) => ({ isMine, number: 0 })));

      const revealed = new Set<number>([
        0, 1, 2,
        3,    5,
        6, 7, 8,
      ]);
      const settled = new Set<number>([1 * 3 + 1]);

      const result = findSettleableCluster(board, revealed, settled, 3, 3, 2, 1);
      expect(result).toEqual({
        mines: [{ col: 2, row: 1 }],
        delta: 10,
      });
    });
  });
});
