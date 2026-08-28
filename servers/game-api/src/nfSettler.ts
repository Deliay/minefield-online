export const NF_PER_MINE_SCORE = 10;

export interface SettledMine {
  col: number;
  row: number;
}

export interface NfSettleResult {
  mines: SettledMine[];
  delta: number;
}

interface Cell {
  isMine: boolean;
  number: number;
}

export function neighbors8(
  col: number,
  row: number,
  cols: number,
  rows: number
): Array<{ col: number; row: number }> {
  const result: Array<{ col: number; row: number }> = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = col + dx;
      const ny = row + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        result.push({ col: nx, row: ny });
      }
    }
  }
  return result;
}

export function collectMineCluster(
  board: Cell[][],
  settled: Set<number>,
  seedCol: number,
  seedRow: number,
  cols: number,
  rows: number
): SettledMine[] | null {
  const cluster: SettledMine[] = [];
  const visited = new Set<number>();
  const queue: Array<{ col: number; row: number }> = [{ col: seedCol, row: seedRow }];

  const cellKey = (c: number, r: number) => c * rows + r;

  if (seedRow < 0 || seedRow >= rows || seedCol < 0 || seedCol >= cols) return null;
  if (!board[seedRow][seedCol].isMine) return null;
  if (settled.has(cellKey(seedCol, seedRow))) return null;

  while (queue.length > 0) {
    const { col, row } = queue.shift()!;
    const key = cellKey(col, row);

    if (visited.has(key)) continue;
    if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
    if (!board[row][col].isMine) continue;
    if (settled.has(key)) continue;

    visited.add(key);
    cluster.push({ col, row });

    for (const neighbor of neighbors8(col, row, cols, rows)) {
      if (!visited.has(cellKey(neighbor.col, neighbor.row))) {
        queue.push(neighbor);
      }
    }
  }

  return cluster;
}

export function findSettleableCluster(
  board: Cell[][],
  revealed: Set<number>,
  settled: Set<number>,
  cols: number,
  rows: number,
  seedCol: number,
  seedRow: number
): NfSettleResult | null {
  const cluster = collectMineCluster(board, settled, seedCol, seedRow, cols, rows);
  if (!cluster || cluster.length === 0) return null;

  const cellKey = (c: number, r: number) => c * rows + r;

  for (const mine of cluster) {
    const neighbors = neighbors8(mine.col, mine.row, cols, rows);
    for (const neighbor of neighbors) {
      if (board[neighbor.row][neighbor.col].isMine) continue;
      const nKey = cellKey(neighbor.col, neighbor.row);
      if (!revealed.has(nKey)) {
        return null;
      }
    }
  }

  return {
    mines: cluster,
    delta: cluster.length * NF_PER_MINE_SCORE,
  };
}
