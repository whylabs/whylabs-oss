export const createLatencyText = (latencyInMillis: number | null | undefined): string => {
  if (typeof latencyInMillis !== 'number') return '-';

  const formatDisplay = (value: number) => value.toFixed(2).replace(/\.00$/, '');

  if (latencyInMillis < 1000) return `${Math.round(latencyInMillis)} ms`;

  const latencySeconds = latencyInMillis / 1000;
  if (latencySeconds < 60) return `${formatDisplay(latencySeconds)} sec`;

  const latencyMinutes = latencySeconds / 60;
  if (latencyMinutes < 60) return `${formatDisplay(latencyMinutes)} min`;

  const latencyHours = latencyMinutes / 60;
  if (latencyHours < 24) return `${formatDisplay(latencyHours)} hr`;

  const latencyDays = latencyHours / 24;
  return `${formatDisplay(latencyDays)} days`;
};
