// Collapse the window width to the breakpoint it falls in (<768, <1024, or wider).
// Storing this in state instead of the raw width means a resize only re-renders a
// page when it actually crosses a breakpoint, not on every pixel of the drag.
export const bucketWidth = (width) => (width < 768 ? 0 : width < 1024 ? 768 : 1024);
