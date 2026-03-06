## 2026-03-04 - Hoisting Intl.DateTimeFormat
**Learning:** Frequent, synchronous instantiations of `Intl.DateTimeFormat` within React renders or tight loops (e.g. `usePlayerWatchdog` interval) cause noticeable CPU and memory overhead.
**Action:** Always extract and hoist `Intl.DateTimeFormat` instances to the module scope (outside of components or loops) so they are instantiated once and reused.

## 2026-03-06 - [Preventing Clock-Driven Re-Renders]
**Learning:** A centralized clock updating every second will cause all child components to re-render, creating massive CPU overhead, even for components that only need minute-granularity or don't use the clock directly.
**Action:** Wrap heavy UI components (like Carousels and Tickers) with `React.memo`, memoize their props using `useCallback`/`useMemo`, and pass rounded time units (e.g., `minuteDate`) to components that don't need second-level precision.
