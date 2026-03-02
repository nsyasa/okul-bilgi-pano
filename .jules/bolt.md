## 2024-06-25 - React Timer Re-Renders with Intl.DateTimeFormat
**Learning:** Frequent React re-renders (like 1-second ticks in a clock component) combined with synchronous object instantiation of `Intl.DateTimeFormat` creates significant CPU/Memory overhead. The V8 engine takes ~100x longer to instantiate an `Intl.DateTimeFormat` object compared to caching and reusing one.
**Action:** Always hoist `Intl.DateTimeFormat` instantiations to the module scope (outside the React component) when the locale and options are static. This ensures they are created exactly once per module load.
