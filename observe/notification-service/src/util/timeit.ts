import { getLogger } from '../providers/logger';

const logger = getLogger('timeit');

export async function timeIt<T>(tag: string, block: () => Promise<T>): Promise<T> {
  const start = process.hrtime.bigint();
  try {
    return await block();
  } finally {
    const end = process.hrtime.bigint();
    const diff = (end - start) / BigInt(1_000_000);
    logger.info(`${tag} took ${diff.toString()}ms.`);
  }
}
