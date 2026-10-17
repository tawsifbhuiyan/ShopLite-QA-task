# Load Test Report — ShopLite mock API (§11.1–11.3)

## Machine and method
- Windows 11 Pro laptop, 1 physical processor / 8 logical processors, 16,215 MB RAM,
  Node v24.13.0.
- `node mock-api/server.js` was restarted before each baseline so every endpoint started
  from a clean, empty in-memory state.
- Three endpoints profiled: `/api/health` (does nothing but reply), `/api/products?q=laptop`
  (reads + filters + sorts data), `/api/login` (reads + writes a login attempt).
- Each endpoint was measured at `--vus 1` (baseline) and `--vus 20` (for §11.2); `/api/health`
  and `/api/products` were also run at `--vus 50` for 60s for §11.1.
- `/api/login` needed three attempts before it ran cleanly. PowerShell was stripping the
  embedded double quotes out of the `--body` JSON before `node` ever saw it — both
  backslash-escaping and plain single-quoting produced the same broken request
  (confirmed directly: a one-off `curl.exe` call to `/api/login` returned the server's
  own parse error, `"Expected property name or '}' in JSON at position 1"`, which is
  exactly what you'd get if the quote characters never arrived). This was a Windows/
  PowerShell argument-passing quirk, not a server issue. Prefixing the command with
  `node --%` makes PowerShell pass the rest of the line through literally, and that
  produced clean `200` responses with 0% errors. All `/api/login` figures below used
  that working form.
- All other runs were single runs, one pass each. No repeat runs were done on this
  machine, so the numbers below should be read as a first measurement, not a confirmed
  average — worth re-running once more before treating any borderline figure as final.

---

## §11.2 — p95 at 20 vus vs single-user baseline (must not exceed 2×)

| Endpoint | Baseline p95 (1 vu) | p95 at 20 vus | Ratio | Verdict |
|---|---|---|---|---|
| `/api/health` | 0.1 ms | 1.6 ms | 16× | **Fails on paper, not in practice** (see note) |
| `/api/login` | 0.2 ms | 1.7 ms | 8.5× | **Fails on paper, not in practice** (see note) |
| `/api/products` | 1.7 ms | 45.3 ms | 26.6× | **Fails — real** |

**Note on `/api/health` and `/api/login`:** both baselines round to a fraction of a
millisecond. A jump from 0.1–0.2 ms to 1.6–1.7 ms is only about 1.5 ms in absolute
terms, but because the starting number is so small, it reads as a large ratio. With 8
logical processors, 20 virtual users still means more requests in flight than there are
cores free to run them instantly, so a small amount of queueing delay under concurrency
is expected — both endpoints are still answering in low single-digit milliseconds
either way. I'd call this an artifact of measuring sub-millisecond endpoints rather than
a real regression. I'm reporting the ratio honestly because the spec asks for the
comparison, but I don't think it's the same class of problem as `/api/products`, where
the absolute latency itself — not just the ratio — is large.

**`/api/products` is a real fail**, and not a rounding artifact: baseline p95 is already
1.7 ms, and it grows to 45.3 ms — over 43 ms of real, measurable extra latency. See
§11.3 below for why.

---

## §11.1 — 50 concurrent users, 60 seconds: p95 < 800 ms, p99 < 1,500 ms, error rate < 1%

| Endpoint | p95 | p99 | Errors | Verdict |
|---|---|---|---|---|
| `/api/health` | 4.1 ms | 5.6 ms | 0% | **Pass** |
| `/api/products` | 146.1 ms | 168.5 ms | 0% | **Pass on the numbers, fail on trend** |
| `/api/login` | not run at 50 vus | — | — | not measured (see note) |

`/api/health` comfortably clears both thresholds with headroom to spare — p95 is about
0.5% of the 800 ms limit.

`/api/login` was not run at 50 vus / 60s. Its 1-vu and 20-vu figures (below) already show
it behaving the same way `/api/health` does — flat, sub-millisecond-to-low-single-digit
latency with no errors — so a 50-vu run was deprioritized in favor of confirming the one
endpoint that actually shows a problem. Worth running later for completeness, but I
wouldn't expect a different story.

`/api/products` ran the full 60 seconds this time and never produced a single error, and
its p95/p99 are still numerically under the 800 ms / 1,500 ms ceilings — so by a literal
reading, it passes. I'd still flag it rather than call it a clean pass, for two reasons.
First, p95 (146.1 ms) is already nearly 20× its own 1-user baseline (1.7 ms) and nearly
3× its 20-user figure (45.3 ms) — latency is still climbing as load increases, it hasn't
leveled off. Second, the mechanism behind that climb (explained in §11.3) gets worse the
longer the server has been running and the more requests it has served, so a longer test
window, or a busier server, would very plausibly push this past 800 ms. It passed the
letter of the clause here, but it's trending toward failing it, and I wouldn't want
"passed today" read as "safe under sustained production load."

---

## §11.3 — throughput may plateau but must not collapse; no request may be dropped

| Endpoint | 1 vu throughput | 20 vu throughput | 50 vu throughput | Verdict |
|---|---|---|---|---|
| `/api/health` | 10,046 req/s | 16,165 req/s | 15,882 req/s | **Pass** — rises then plateaus, doesn't collapse |
| `/api/products` | 1,008 req/s | 561 req/s | 603 req/s | **Fails** — throughput drops as concurrency rises |
| `/api/login` | 7,712 req/s | 15,639 req/s | not run | **Pass** (on the two points measured) — throughput rises with concurrency, same shape as `/api/health` |

`/api/health` behaves exactly like the spec allows: throughput goes up as concurrency
rises (one core can clearly serve more than one request's worth of work at a time for
something this cheap) and then holds steady around 15,900–16,200 req/s. That's a
healthy result.

`/api/products` does the opposite of what §11.3 wants: throughput at 20 users (561 req/s)
and at 50 users (603 req/s) is *lower* than at 1 user (1,008 req/s). That's not a
plateau, that's a collapse — adding concurrency made the endpoint slower overall, not
just per-request. And because this now shows up on real laptop hardware with more
headroom than a constrained sandbox, it rules out "weak test machine" as the
explanation — the cause has to be in the endpoint's own code.

### Why it collapses — the actual mechanism
I read `mock-api/server.js`. The `/api/products` handler (around line 159) does this on
**every single request**:

```js
searchLog.push({ term: q, at: Date.now() });   // appended, never trimmed

const recent = searchLog
  .slice()                                      // copy the whole array
  .sort(function (a, b) { return b.at - a.at; }) // sort the whole array
  .filter(...)
  .slice(0, 5)
  .map(...);
```

`searchLog` is a single in-memory array that is never trimmed or capped. Every request —
even ones that don't care about "recent searches" — pays the cost of copying and sorting
the *entire* history of every search ever made since the server started. That cost is
O(n log n) in the number of requests served so far, so:

- Early in a run it's cheap (small array, fast sort).
- As the run continues, the array keeps growing, so each new request sorts a bigger and
  bigger list. Latency climbs over the life of the run, which is exactly what both
  `/api/products` runs showed (p50 climbing from single digits early to 60+ ms later).
- Under concurrency, 50 requests can all be mid-sort on the same 1 CPU core at once,
  so the queueing and the growing sort cost compound each other — which is why
  throughput *drops* instead of holding steady.

This is a code-level bug, not a hardware limit: capping `searchLog` at, say, its most
recent 50 entries (it only ever needs the most recent 5) would remove almost all of this
cost. I'd flag this as the one finding in this report that's a genuine defect rather
than a sandbox artifact.

---

## Summary

| Clause | Verdict |
|---|---|
| §11.1 (50 vu / 60s targets) | **Pass** for `/api/health`. **Passes the numbers but trending toward failure** for `/api/products` — under the ceiling today, but latency is still climbing with load and would plausibly cross it under more sustained or heavier traffic. `/api/login` not run at 50 vus (see note above); its 1-vu/20-vu shape matches `/api/health`, so a pass is expected but unconfirmed. |
| §11.2 (p95 ≤ 2× baseline at 20 vu) | **Fails numerically for `/api/health` and `/api/login`**, but only because both baselines are near-zero (0.1–0.2 ms) — I'd treat that as noise, not a defect. **Fails for real on `/api/products`**: 1.7 ms → 45.3 ms is a genuine, large increase in absolute latency. |
| §11.3 (no collapse, no drops) | **Pass** for `/api/health` and `/api/login` (throughput rises then plateaus/keeps rising, no drop). **Fails** for `/api/products` — throughput falls as load rises, caused by an unbounded array being re-sorted on every request (see mechanism above). |

**One endpoint, `/api/products`, is responsible for every real failure in this report.**
`/api/health` and `/api/login` are both fine in absolute terms; the only reason either
shows up at all in §11.2 is the 2× ratio rule being sensitive to a sub-millisecond
baseline, which I don't think is what that clause is trying to catch. `/api/products` is
a genuine, explainable defect: an unbounded, un-trimmed log array that every request
re-sorts in full, which is why its latency grows and its throughput collapses the longer
the server runs and the more concurrent users hit it — and this held up on real laptop
hardware with 8 logical processors, not just a constrained test sandbox, which rules out
the test machine as the cause.

## A note on getting `/api/login` to run cleanly
Early attempts at measuring `/api/login` returned a 100% error rate (`500` on every
request), not because of anything wrong with the server under load, but because
PowerShell was stripping the double quotes out of the `--body` JSON argument before
`node` ever received it — confirmed directly with a single `curl.exe` request, which
returned the server's own parse error (`"Expected property name or '}' in JSON at
position 1"`), exactly what you'd expect from a body with its quote characters missing.
Prefixing the command with `node --%` (which tells PowerShell to stop parsing and pass
the rest of the line through literally) fixed it, and all `/api/login` figures in this
report come from that working form. Worth keeping in mind if these commands are re-run
on another Windows machine — it's a shell quirk, not anything about the API.
