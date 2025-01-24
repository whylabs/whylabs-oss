export const DEFAULT_SIZE_OPTIONS = [10, 25, 50, 75, 100];

export const getPaginationSizeOptions = ({
  customSizeOptions,
  rowsPerPage,
}: {
  customSizeOptions?: number[];
  rowsPerPage: number;
}) => {
  const listToUse = customSizeOptions || [...DEFAULT_SIZE_OPTIONS];

  if (listToUse.includes(rowsPerPage)) return listToUse;

  return [rowsPerPage, ...listToUse].sort((a, b) => a - b);
};
