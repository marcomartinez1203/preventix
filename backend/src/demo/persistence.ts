import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { get, put, BlobPreconditionFailedError, BlobError } from '@vercel/blob';

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
export function blobPersistence<T>(pathname: string, client = { get, put }): JsonPersistence<T> {
  return serialized(async (initial, change) => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const stored = await client.get(pathname, { access: 'private', useCache: false });
      if (stored && (stored.statusCode !== 200 || !stored.stream)) throw new Error('No se pudo leer el archivo de Vercel Blob.');
      const before = stored ? await new Response(stored.stream).text() : undefined;
      const data: T = before !== undefined ? JSON.parse(before) : await initial();
      const result = await change(data);
      const after = JSON.stringify(data);
      if (before === after) return result;
      try {
        await client.put(pathname, after, {
          access: 'private', addRandomSuffix: false, contentType: 'application/json',
          allowOverwrite: !!stored,
          ...(stored ? { ifMatch: stored.blob.etag } : {}),
        });
        return result;
      } catch (error) {
        // Concurrent first creation uses allowOverwrite:false; subsequent writes use CAS.
        let conflict = error instanceof BlobPreconditionFailedError;
        if (!stored && error instanceof BlobError) {
          // Blob can report a first-creation race as a generic service error.
          conflict = !!await client.get(pathname, { access: 'private', useCache: false });
        }
        if (!conflict) throw error;
        await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 60));
      }
    }
    throw new Error('Hay varias actualizaciones simultáneas. Intenta guardar nuevamente.');
  });
}
