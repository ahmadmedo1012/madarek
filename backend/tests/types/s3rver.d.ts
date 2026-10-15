/**
 * Ambient declaration for s3rver 3.7.1 — the dev-only fake S3 server
 * used by tests/modules/storage-s3-live.test.ts (r167, WS-1).
 *
 * s3rver ships no TypeScript types of its own; this covers ONLY the
 * programmatic surface the live test uses (constructor options, run(),
 * close() and the httpServer hook for idle-connection cleanup). The
 * shapes mirror lib/s3rver.js (defaultOptions / run / listen / close).
 * Dev dependency only — never a runtime import (the no-new-runtime-deps
 * house rule; see storage.ts's header).
 */
declare module 's3rver' {
  /** Bucket provisioned before the server starts listening. */
  export interface S3rverBucketConfiguration {
    name: string;
    configs?: Array<Buffer | string>;
  }

  export interface S3rverOptions {
    /** Bind address (default 'localhost'). */
    address?: string;
    /** Bind port — 0 asks the OS for an ephemeral port. */
    port?: number;
    /** Root directory for the filesystem store. */
    directory?: string;
    /** Suppress s3rver's request logging. */
    silent?: boolean;
    /** Wipe the directory contents when the server closes. */
    resetOnClose?: boolean;
    /** Buckets created before listening (no CreateBucket round-trip). */
    configureBuckets?: S3rverBucketConfiguration[];
  }

  export interface S3rverAddress {
    port: number;
    address: string;
    family: string;
  }

  class S3rver {
    constructor(options?: S3rverOptions);
    /** Configure buckets + listen; resolves with the bound address. */
    run(): Promise<S3rverAddress>;
    /** Close the HTTP server (and reset the store when resetOnClose). */
    close(): Promise<void>;
    /** The underlying http server once run() resolved (cleanup hook). */
    httpServer?: {
      closeIdleConnections?(): void;
      closeAllConnections?(): void;
    };
  }

  export = S3rver;
}
