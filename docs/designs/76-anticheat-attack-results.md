# #76: attacks against the A/B lab

Tested on 2026-10-31 against the local development server. This is evidence for the
[design comparison](76-server-side-anticheat.md), not a production security audit.
The existing production score submission path is outside this experiment.

## Results

A's public seed allowed a script to reconstruct every mine and submit a perfect
replay: **60 wins in 60 games**, split equally across all three presets. Accepted
server durations were 0–2 ms on localhost. Validating the replay and using a server
clock did not prevent this shortcut. Hiding the controls or obfuscating client
code would not remove it.

B returned no seed, live mine identities, closed-cell clues or flag correctness in
the tested responses. A separate bot used only revealed clues, ordinary neighboring
cell deductions and subset deductions. It made no guesses and stopped when it
could not deduce another safe move. It still won **32 of 60 games**. The remaining
28 stalled; none lost. Winning server durations were 10–275 ms on localhost.
Keeping the board private prevents the full-information shortcut, but does not
establish that a human played.

| Preset          | A seed exploit, run 1 / run 2 | B clue bot, run 1 / run 2 | B stalled, total |
| --------------- | ----------------------------- | ------------------------- | ---------------- |
| 9×9, 10 mines   | 10/10 / 10/10                 | 6/10 / 8/10               | 6/20             |
| 16×16, 40 mines | 10/10 / 10/10                 | 10/10 / 7/10              | 3/20             |
| 30×16, 99 mines | 10/10 / 10/10                 | 0/10 / 1/10               | 19/20            |

These are different attacks with different available information, on independently
generated boards. The counts describe these samples, not comparative protection
percentages. A stronger clue solver or a bot willing to guess could do more.
These timings include local HTTP overhead, not realistic deployment latency.

| Attack                                                    | A: local + replay                            | B: server-owned                               |
| --------------------------------------------------------- | -------------------------------------------- | --------------------------------------------- |
| Read seed and reconstruct the entire board                | Exploited                                    | No seed or hidden state observed              |
| Claim an immediate win without valid play                 | Rejected                                     | Rejected                                      |
| Supply fake time, win and 3BV fields with a valid replay  | Fields ignored; server derives result        | Client finish claim rejected                  |
| Use another cookie's game ID                              | Rejected with 404                            | Rejected with 404                             |
| Submit an out-of-bounds action                            | Rejected with 400                            | Rejected with 400                             |
| Resubmit a result / replay a move eight times in parallel | Stable original result; changed log rejected | One revision; conflicting stale move rejected |
| Change an active server session to replay mode            | Not applicable                               | Rejected with 409                             |
| Flag every closed cell for a hidden-mine oracle           | Seed already exposes board                   | No correctness/clue leak or flags-only win    |
| Reset cookie after 30 starts in a minute                  | Limit bypassed                               | Limit bypassed                                |

The cookie reset bypass is an explicit limitation of the disposable lab. Production
needs shared limits tied to validated accounts and trusted deployment IPs. Game ID
ownership checks do not test theft of the session cookie itself. The tests do not
exhaustively establish absence of side channels or other hidden-state leaks.

## Reproduce

In one terminal:

```sh
bun install
bun run dev --host 127.0.0.1 --port 5178
```

In another:

```sh
bun scripts/attack-anticheat.ts http://127.0.0.1:5178 /tmp/zsweep-anticheat-attacks.json
```

The harness accepts only localhost targets. It uses real HTTP requests and its own
cookies, imports the public board engine to exploit A, and never imports the server
store at runtime or reads B's private state. It writes a JSON report with individual
trial outcomes, durations, action counts and attack findings. It makes no profile
or global-stat writes. The two observed runs used 3,176 and 3,389 requests. Each run
uses fresh boards, so counts and timings will vary.

Lint, Svelte checks and all 21 engine/session tests passed alongside the harness;
Svelte checks retain eight existing warnings in unrelated modal components.
Browser checks also confirmed `a` flags/unflags in both modes and chords in A,
including while a toolbar button retains keyboard focus.

If B feels acceptable in the manual latency test, it is the stronger choice for
ranked games: it removes A's reliable full-board exploit. Neither approach alone
provides bot prevention, and a minimum completion time is not proof of human play.
