## 2026-03-04 - Hoisting Intl.DateTimeFormat
**Learning:** Frequent, synchronous instantiations of `Intl.DateTimeFormat` within React renders or tight loops (e.g. `usePlayerWatchdog` interval) cause noticeable CPU and memory overhead.
**Action:** Always extract and hoist `Intl.DateTimeFormat` instances to the module scope (outside of components or loops) so they are instantiated once and reused.
