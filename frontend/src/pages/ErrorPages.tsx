/* r338 T-99b entry-chunk diet: the routed error sheets ride ONE lazy
 * chunk — the MorePages pattern (App.tsx bundles a page family's named
 * exports behind a single dynamic import). Every extra chunk boundary
 * costs ~0.2KB gz of framing on the wire; these three sheets are one
 * family, one seat. No behavior change: same modules, same routes. */
export { default as Error500Page } from './Error500Page';
export { default as Error403Page } from './Error403Page';
export { default as MaintenancePage } from './MaintenancePage';
