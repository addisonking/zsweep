import type { Cell } from '$lib/minesweeper';

export interface Snapshot {
	grid: Cell[][];
	cursor: { r: number; c: number };
	timestamp: number;
}

// A simple class to manage the history
export class ReplaySystem {
	history: Snapshot[] = [];

	reset() {
		this.history = [];
	}

	capture(grid: Cell[][], cursor: { r: number; c: number }) {
		// Deep copy is expensive but necessary for snapshots
		// StructuredClone is faster than JSON.parse/stringify if supported (modern browsers yes)
		const gridCopy = structuredClone(grid);

		this.history.push({
			grid: gridCopy,
			cursor: { ...cursor },
			timestamp: Date.now()
		});
	}

	getFrame(index: number) {
		if (index < 0) return this.history[0];
		if (index >= this.history.length) return this.history[this.history.length - 1];
		return this.history[index];
	}
}

export const replaySystem = new ReplaySystem();
