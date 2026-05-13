/**
 * Transformers always imports `onnxruntime-node`, then picks web vs node from `process.release.name`.
 * In Electron's renderer that name is often `"node"` while we still must use the WASM build — the real
 * `onnxruntime-node` package is aliased away (it pulls `fs`). Re-export `onnxruntime-web` here so the
 * "node" branch still receives a working ORT with `registerBackend` etc.
 */
import * as ortWeb from "onnxruntime-web";

const ort = (ortWeb as { default?: typeof ortWeb }).default ?? ortWeb;
export default ort;
