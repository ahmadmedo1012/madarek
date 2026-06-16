// pdf-parse v1.1.1 doesn't ship types for its `lib/` subpath.
// We import from there to bypass the package's debug branch in index.js.
declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
    text: string;
  }
  function pdfParse(buffer: Buffer | Uint8Array, options?: Record<string, unknown>): Promise<PdfParseResult>;
  export default pdfParse;
}
