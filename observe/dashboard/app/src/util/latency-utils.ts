import { friendlyFormat } from './numbers';

export const createLatencyText = (latencyInMillis: number | null | undefined): string => {
  if (typeof latencyInMillis !== 'number') return '-';

  if (latencyInMillis < 1000) return `${Math.round(latencyInMillis)} ms`;

  const latencySeconds = latencyInMillis / 1000;

  return `${friendlyFormat(latencyInMillis, 2)} ms (${friendlyFormat(latencySeconds, 2)} s)`;
};
