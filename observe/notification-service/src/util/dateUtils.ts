export type NullableDateConstructor = number | string | null | Date;
export type DateConstructor = Exclude<NullableDateConstructor, null>;

const ONLY_NUMBER_REGEX = /^\d+$/;
export const newDateFrom = (date: DateConstructor): Date => {
  if (typeof date === 'object') return new Date(date);
  if (typeof date === 'string' && ONLY_NUMBER_REGEX.test(date)) return new Date(Number(date));
  return new Date(date);
};

export const getFullDateFromISO = (isoString: string): string => isoString.substring(0, 10);

export const formatDateTimeNumber = (value: number | string): string => String(value).padStart(2, '0');

export const dateConstructorToDatePickerFormat = (
  value: NullableDateConstructor,
  {
    includeHours = true,
  }: {
    includeHours?: boolean;
  } = {},
): string | null => {
  if (!value) return null;
  const date = newDateFrom(value);
  const isoString = date.toISOString();
  const dateString = getFullDateFromISO(isoString);
  if (!includeHours) return dateString;

  const utcHour = formatDateTimeNumber(date.getUTCHours());
  const utcMinutes = formatDateTimeNumber(date.getUTCMinutes());

  return dateString.concat(`T${utcHour}h${utcMinutes}m`);
};
