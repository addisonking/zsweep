import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import {
	PRESETS,
	applyMove,
	newGame,
	type Action,
	type Game,
	type Preset,
	type Variant
} from '../src/lib/game/anticheat/engine';
import type { SessionView } from '../src/lib/server/anticheat/sessions';

const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:5178').origin;
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname)) {
	throw new Error('This attack harness only targets the local development lab');
}
const reportPath = process.argv[3] ?? '/tmp/zsweep-anticheat-attacks.json';
let requests = 0;
type Finding = {
	attack: string;
	variant: Variant | 'both';
	outcome: 'blocked' | 'exploited' | 'limited';
	detail: string;
};
const findings: Finding[] = [];
const first: Action = { type: 'reveal', r: 4, c: 4 };

class Attacker {
	private cookie = '';
	async post(body: object, expected = 200): Promise<SessionView> {
		requests++;
		const response = await fetch(`${origin}/api/anticheat`, {
			method: 'POST',
			headers: { origin, 'content-type': 'application/json', cookie: this.cookie },
			body: JSON.stringify(body)
		});
		const cookie = response.headers.get('set-cookie');
		if (cookie) this.cookie = cookie.split(';')[0];
		const value = await response.json();
		assert.equal(response.status, expected, JSON.stringify(value));
		return value;
	}
	start(variant: Variant, preset: Preset = '9x9') {
		return this.post({ operation: 'start', variant, preset, first });
	}
	move(view: SessionView, action: Action, expected = 200) {
		return this.post({ operation: 'move', id: view.id, revision: view.revision, action }, expected);
	}
	finish(view: SessionView, moves: Action[], extra = {}, expected = 200) {
		return this.post({ operation: 'finish', id: view.id, moves, ...extra }, expected);
	}
}

function fullKnowledgeWin(preset: Preset, issued: SessionView) {
	assert.equal(typeof issued.seed, 'number', 'seed extraction failed');
	const game = newGame(preset, issued.seed!, first);
	const moves: Action[] = [];
	for (const cell of game.grid.flat()) {
		if (cell.isMine || cell.isOpen || game.status !== 'playing') continue;
		const move: Action = { type: 'reveal', r: cell.row, c: cell.col };
		moves.push(move);
		applyMove(game, move);
	}
	assert.equal(game.status, 'won');
	return moves;
}

function assertNoLeak(view: SessionView) {
	assert.equal(Object.hasOwn(view, 'seed'), false);
	if (view.result) return;
	assert.equal(Object.hasOwn(view, 'result'), false);
	for (const cell of view.game.grid.flat()) {
		assert.equal(cell.isMine, false);
		if (!cell.isOpen) assert.equal(cell.neighborCount, 0);
		assert.equal(Object.hasOwn(cell, 'isWrong'), false);
	}
}

const trials: {
	variant: Variant;
	preset: Preset;
	outcome: string;
	elapsedMs: number | null;
	actions: number;
	guesses: number;
}[] = [];
console.log('Attacking only', origin);
for (const preset of Object.keys(PRESETS) as Preset[]) {
	const attacker = new Attacker();
	for (let i = 0; i < 10; i++) {
		const issued = await attacker.start('replay', preset);
		const done = await attacker.finish(issued, fullKnowledgeWin(preset, issued));
		assert.equal(done.result?.win, true);
		trials.push({
			variant: 'replay',
			preset,
			outcome: 'won',
			elapsedMs: done.result!.elapsedMs,
			actions: done.result!.actions,
			guesses: 0
		});
	}
}
findings.push({
	attack: 'Read seed and fabricate a perfect solution',
	variant: 'replay',
	outcome: 'exploited',
	detail: '30/30 wins using the public seed, no human gameplay or live move requests'
});

for (const variant of ['replay', 'server'] as const) {
	const attacker = new Attacker();
	const issued = await attacker.start(variant);
	const other = new Attacker();
	await other.start(variant);
	if (variant === 'replay') await other.finish(issued, [], {}, 404);
	else await other.move(issued, first, 404);
	findings.push({
		attack: 'Use a stolen game ID from another cookie',
		variant,
		outcome: 'blocked',
		detail: '404: a game ID alone does not transfer ownership'
	});

	await attacker.finish(
		issued,
		[],
		{ win: true, elapsedMs: 0, time: 0 },
		variant === 'replay' ? 400 : 409
	);
	await attacker.post(
		{
			operation: 'move',
			id: issued.id,
			revision: issued.revision,
			variant: 'replay',
			action: { type: 'won', r: 0, c: 0 }
		},
		variant === 'replay' ? 409 : 400
	);
	findings.push({
		attack: 'Claim an immediate win without playing',
		variant,
		outcome: 'blocked',
		detail: 'Empty replay or invented terminal action rejected'
	});

	const invalid: Action = { type: 'reveal', r: -1, c: 0 };
	if (variant === 'replay') await attacker.finish(issued, [invalid], {}, 400);
	else await attacker.move(issued, invalid, 400);
	findings.push({
		attack: 'Submit out-of-bounds moves',
		variant,
		outcome: 'blocked',
		detail: '400 with the current valid session revision; no stale-revision shortcut in this check'
	});

	if (variant === 'replay') {
		await new Promise((done) => setTimeout(done, 40));
		const solved = fullKnowledgeWin('9x9', issued);
		const done = await attacker.finish(issued, solved, {
			time: 0,
			elapsedMs: -999,
			threeBV: 999999,
			win: false
		});
		assert.ok(done.result!.elapsedMs >= 40);
		assert.notEqual(done.result!.threeBV, 999999);
		assert.equal(done.result!.win, true);
		const duplicates = await Promise.all(
			Array.from({ length: 8 }, () => attacker.finish(issued, solved))
		);
		for (const duplicate of duplicates) assert.deepEqual(duplicate, done);
		await attacker.finish(issued, [...solved, first], {}, 409);
		findings.push({
			attack: 'Forge time, metrics, then resubmit in parallel',
			variant,
			outcome: 'blocked',
			detail:
				'Server derives metrics and elapsed time; 8 identical submissions returned one stable result; changed log rejected'
		});
		await attacker.move(issued, first, 409);
	} else {
		assertNoLeak(issued);
		await attacker.finish(issued, [], { variant: 'replay', seed: 42, win: true }, 409);
		findings.push({
			attack: 'Downgrade an active server game to replay',
			variant,
			outcome: 'blocked',
			detail: '409: request fields cannot change an issued session variant'
		});
		const closed = issued.game.grid.flat().find((cell) => !cell.isOpen)!;
		const action: Action = { type: 'flag', r: closed.row, c: closed.col };
		const duplicates = await Promise.all(
			Array.from({ length: 8 }, () => attacker.move(issued, action))
		);
		for (const duplicate of duplicates) {
			assert.equal(duplicate.revision, 1);
			assert.equal(duplicate.game.grid[closed.row][closed.col].isFlagged, true);
			assertNoLeak(duplicate);
		}
		await attacker.move(issued, first, 409);
		findings.push({
			attack: 'Replay or race moves to mutate twice',
			variant,
			outcome: 'blocked',
			detail:
				'8 concurrent identical flags advanced one revision; a different stale move returned 409'
		});
		let view = duplicates[0];
		// Flag every closed cell to look for correctness feedback or hidden-clue leakage.
		for (const cell of view.game.grid.flat()) {
			if (cell.isOpen || cell.isFlagged) continue;
			view = await attacker.move(view, { type: 'flag', r: cell.row, c: cell.col });
			assertNoLeak(view);
		}
		assert.equal(view.result, undefined, 'flags alone forged a win');
		findings.push({
			attack: 'Use flags as an oracle for hidden mines',
			variant,
			outcome: 'blocked',
			detail:
				'Flagging all closed cells disclosed neither correctness nor clues and did not award a win'
		});
	}
}

// A bot that never sees a seed or reads hidden cells. It derives constraints only
// from open clues, applies elementary and subset deductions, then stops at ambiguity.
function nextVisibleMove(game: Game): Action | null {
	const cols = game.grid[0].length;
	const constraints: { cells: Set<number>; mines: number }[] = [];
	for (const clue of game.grid.flat()) {
		if (!clue.isOpen) continue;
		const cells = new Set<number>();
		let flags = 0;
		for (let dr = -1; dr <= 1; dr++)
			for (let dc = -1; dc <= 1; dc++) {
				if (!dr && !dc) continue;
				const n = game.grid[clue.row + dr]?.[clue.col + dc];
				if (!n || n.isOpen) continue;
				if (n.isFlagged) flags++;
				else cells.add(n.row * cols + n.col);
			}
		if (cells.size) constraints.push({ cells, mines: clue.neighborCount - flags });
	}
	const action = (index: number, type: Action['type']): Action => ({
		type,
		r: Math.floor(index / cols),
		c: index % cols
	});
	for (const constraint of constraints) {
		if (constraint.mines === 0) return action([...constraint.cells][0], 'reveal');
		if (constraint.mines === constraint.cells.size) return action([...constraint.cells][0], 'flag');
	}
	for (const a of constraints)
		for (const b of constraints) {
			if (a.cells.size >= b.cells.size || ![...a.cells].every((cell) => b.cells.has(cell)))
				continue;
			const difference = [...b.cells].filter((cell) => !a.cells.has(cell));
			const mines = b.mines - a.mines;
			if (mines === 0) return action(difference[0], 'reveal');
			if (mines === difference.length) return action(difference[0], 'flag');
		}
	return null;
}

for (const preset of Object.keys(PRESETS) as Preset[]) {
	const attacker = new Attacker();
	for (let i = 0; i < 10; i++) {
		let view = await attacker.start('server', preset);
		for (let move = 0; move < 600 && !view.result; move++) {
			assertNoLeak(view);
			const action = nextVisibleMove(view.game);
			if (!action) break;
			view = await attacker.move(view, action);
		}
		assert.notEqual(view.game.status, 'lost', 'visible-clue deductions were not safe');
		trials.push({
			variant: 'server',
			preset,
			outcome: view.game.status === 'won' ? 'won' : 'stalled',
			elapsedMs: view.result?.elapsedMs ?? null,
			actions: view.game.actions,
			guesses: 0
		});
	}
}
const botWins = trials.filter(
	(trial) => trial.variant === 'server' && trial.outcome === 'won'
).length;
findings.push({
	attack: 'Automate play using only revealed clues',
	variant: 'server',
	outcome: botWins ? 'exploited' : 'limited',
	detail: `${botWins}/30 bot wins with no hidden information and no guesses; other boards stalled at ambiguity`
});
findings.push({
	attack: 'Read seed and fabricate a perfect solution',
	variant: 'server',
	outcome: 'blocked',
	detail:
		'No seed or live mine identities were returned in 30 bot games or oracle probes; this checks tested responses, not every possible leak'
});

for (const variant of ['replay', 'server'] as const) {
	const attacker = new Attacker();
	for (let i = 0; i < 30; i++) await attacker.start(variant);
	await attacker.post({ operation: 'start', variant, preset: '9x9', first }, 429);
	await new Attacker().start(variant);
	findings.push({
		attack: 'Reset cookie to evade game-start limit',
		variant,
		outcome: 'exploited',
		detail:
			'31st start returned 429; a fresh cookie immediately started another game (known development-only limit)'
	});
}

const report = {
	target: origin,
	generatedAt: new Date().toISOString(),
	requests,
	findings,
	trials
};
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
for (const finding of findings)
	console.log(`${finding.variant}: ${finding.outcome}: ${finding.attack} — ${finding.detail}`);
console.log(`Report: ${reportPath}; ${requests} requests; no profile or global-stat writes`);
