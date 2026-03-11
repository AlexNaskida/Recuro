import { Buffer } from "buffer";

declare global {
  // eslint-disable-next-line no-var
  var Buffer: typeof Buffer | undefined;
}

if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}
