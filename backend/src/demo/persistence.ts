import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { get, head, put, BlobNotFoundError, BlobPreconditionFailedError, BlobError } from '@vercel/blob';

export class StorageConflictError extends Error {
  constructor() { super('No se pudo confirmar la versión del archivo. Intenta guardar nuevamente.'); }
}

export interface JsonPersistence<T> {
  transaction<R>(initial: () => Promise<T>, change: (value: T) => Promise<R>): Promise<R>;
}

function serialized<T>(transaction: JsonPersistence<T>['transaction']): JsonPersistence<T> {
  let queue: Promise<unknown> = Promise.resolve();
  return { transaction(initial, change) {
    const result = queue.then(() => transaction(initial, change));
    queue = result.catch(() => undefined);
    return result;
  } };
}

export function filePersistence<T>(filePath: string): JsonPersistence<T> {
  return serialized(async (initial, change) => {
    let data: T;
    let before: string | undefined;
    try { before = await readFile(filePath, 'utf8'); data = JSON.parse(before); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      data = await initial();
    }
    const result = await change(data);
    const after = JSON.stringify(data);
    if (before !== after) {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath + '.tmp', after, 'utf8');
      await rename(filePath + '.tmp', filePath);
    }
    return result;
  });
}

// Injecting the SDK lets the tests exercise independent instances and ETag conflicts.
export function blobPersistence<T>(pathname: string, client = { get, head, put }): JsonPersistence<T> {
  return serialized(async (initial, change) => {
    // An explicit token avoids silently switching to the deployment's OIDC identity.
    const auth = process.env.BLOB_READ_WRITE_TOKEN ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {};
    const read = () => client.get(pathname, { access: 'private', useCache: false, ...auth });
    for (let attempt = 0; attempt < 8; attempt++) {
      const stored = await read();
      if (stored && (stored.statusCode !== 200 || !stored.stream)) throw new Error('No se pudo leer el archivo de Vercel Blob.');
      const before = stored ? await new Response(stored.stream).text() : undefined;
      const data: T = before !== undefined ? JSON.parse(before) : await initial();
      const result = await change(data);
      const after = JSON.stringify(data);
      if (before === after) return result;
      let writeEtag: string | undefined;
      if (stored) {
        try {
          // The download's HTTP ETag can describe a transformed representation.
          // Use the storage API's metadata ETag for conditional writes instead.
          const metadata = await client.head(pathname, auth);
          if (!metadata.etag) throw new Error('Vercel Blob no devolvió la versión de escritura del archivo.');
          writeEtag = metadata.etag;
        } catch (error) {
          if (error instanceof BlobNotFoundError) continue;
          throw error;
        }
        // Metadata must describe the exact data on which this update was based.
        // Re-read after head so a concurrent edit cannot be silently overwritten.
        const confirmed = await read();
        if (!confirmed?.stream || await new Response(confirmed.stream).text() !== before) continue;
      }
      try {
        await client.put(pathname, after, {
          access: 'private', addRandomSuffix: false, contentType: 'application/json',
          allowOverwrite: !!stored,
          ...auth,
          ...(writeEtag ? { ifMatch: writeEtag } : {}),
        });
        return result;
      } catch (error) {
        // Concurrent first creation uses allowOverwrite:false; subsequent writes use CAS.
        let conflict = error instanceof BlobPreconditionFailedError;
        if (!stored && error instanceof BlobError) {
          // Blob can report a first-creation race as a generic service error.
          conflict = !!await read();
        }
        if (!conflict) throw error;
        await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 60));
      }
    }
    throw new StorageConflictError();
  });
}
