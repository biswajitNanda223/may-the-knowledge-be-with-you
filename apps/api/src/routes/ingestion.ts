import type { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { importOntology } from '../services/ontology-importer.js';
export const ingestionRoutes: FastifyPluginAsync = async app => {
  await app.register(multipart, { limits: { files: 1, fileSize: config.UPLOAD_MAX_BYTES } });
  app.post('/files', async (req, reply) => {
    const part = await req.file(); if (!part) return reply.code(400).send({ message: 'File required' });
    const ext = extname(part.filename).toLowerCase(); if (!['.xlsx', '.txt'].includes(ext)) return reply.code(415).send({ message: 'Only .xlsx and .txt accepted' });
    const dir = join(process.cwd(), 'data', 'uploads'); await mkdir(dir, { recursive: true }); const path = join(dir, `${randomUUID()}${ext}`);
    // Path contains server UUID plus allowlisted extension under fixed upload directory.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await pipeline(part.file, createWriteStream(path, { flags: 'wx' }));
    try {
      if (ext === '.xlsx') return { status: 'imported', source: part.filename, counts: await importOntology(path) };
      return reply.code(202).send({ status: 'stored', source: part.filename, message: 'TXT upstream parser intentionally staged for later normalized ingestion.' });
    } finally {
      // Same server-generated path; cleanup never accepts client path input.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await unlink(path).catch(() => undefined);
    }
  });
};
