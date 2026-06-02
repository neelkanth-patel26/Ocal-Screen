/**
 * Default export with no enumerable keys. Used as a Vite alias target for Node
 * builtins that `@xenova/transformers` imports; `env.js` treats an empty object
 * as “no filesystem” so it stays on browser / remote paths.
 */
const empty = Object.create(null) as Record<string, never>;
export default empty;
