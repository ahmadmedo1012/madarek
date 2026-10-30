/**
 * /auth/login — route alias so web-parity deep links (`madarek://auth/login`,
 * shared links, and emails) resolve instead of hitting the not-found screen.
 * The canonical mobile route is /auth; this file only re-exports it.
 */
export { default } from "./index";
