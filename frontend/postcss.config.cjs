/* R343 — hermetic CSS pipeline: this repo's styles are plain CSS with
 * Vite's built-in transforms (no PostCSS plugins — CI builds with none).
 * The explicit empty config stops ancestor-directory config pollution
 * in local trees that live inside another project's folder. */
module.exports = { plugins: [] };
