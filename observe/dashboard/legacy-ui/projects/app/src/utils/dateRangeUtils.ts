export const getUTCEndOfWeek = (date: Date): Date => {
  const copy = new Date(date);
  copy.setUTCDate(date.getUTCDate() - date.getUTCDay() + 6);
  return getUTCEndOfDay(copy);
};

export const getUTCStartOfWeek = (date: Date): Date => {
  const copy = new Date(date);
  copy.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return getUTCStartOfDay(copy);
};

export const getUTCStartOfMonth = (date: Date): Date => {
  const copy = new Date(date);
  copy.setUTCDate(1);
  return getUTCStartOfDay(copy);
};

export const getUTCEndOfMonth = (date: Date): Date => {
  const copy = new Date(date);
  copy.setUTCMonth(date.getUTCMonth() + 1);
  copy.setUTCDate(0);
  return getUTCEndOfDay(copy);
};

export const getUTCStartOfDay = (dateObject: Date | number): Date => {
  const copy = new Date(dateObject);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
};

export const getUTCEndOfDay = (dateObject: Date | number): Date => {
  const copy = new Date(dateObject);
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
};

export interface SimpleDateRange {
  from: number;
  to: number;
}
