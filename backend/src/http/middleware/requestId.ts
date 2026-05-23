import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

/** Attach a unique id to each request and echo it back as `x-request-id`. */
export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  const id = incoming && incoming.length <= 64 ? incoming : randomUUID();
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
};
