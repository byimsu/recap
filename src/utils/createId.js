// Combines a timestamp with two independent random segments to avoid
// collisions when users create multiple local records in quick succession.
export const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
