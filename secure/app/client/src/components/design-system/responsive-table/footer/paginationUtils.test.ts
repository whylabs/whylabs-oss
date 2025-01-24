import { DEFAULT_SIZE_OPTIONS, getPaginationSizeOptions } from './paginationUtils';

describe('getPaginationSizeOptions', () => {
  it('returns the custom size options if provided', () => {
    const customSizeOptions = [10, 20, 30];
    const rowsPerPage = 10;
    const result = getPaginationSizeOptions({ customSizeOptions, rowsPerPage });
    expect(result).toStrictEqual(customSizeOptions);
  });

  it('returns the default size options if custom size options are not provided', () => {
    const rowsPerPage = 10;
    const result = getPaginationSizeOptions({ rowsPerPage });
    expect(result).toStrictEqual(DEFAULT_SIZE_OPTIONS);
  });

  it('includes the rowsPerPageValue in the result if is not part of default sizes', () => {
    const rowsPerPage = 5;
    const result = getPaginationSizeOptions({ rowsPerPage });
    expect(result).toStrictEqual([5, ...DEFAULT_SIZE_OPTIONS]);
  });

  it('includes the rowsPerPage value in the result if it is not in the custom size options', () => {
    const customSizeOptions = [20, 30];
    const rowsPerPage = 10;

    const result = getPaginationSizeOptions({ customSizeOptions, rowsPerPage });
    expect(result).toStrictEqual([10, 20, 30]);
  });

  it('sorts the result in ascending order', () => {
    const customSizeOptions = [30, 10, 50];
    const rowsPerPage = 20;

    const result = getPaginationSizeOptions({ customSizeOptions, rowsPerPage });
    expect(result).toStrictEqual([10, 20, 30, 50]);
  });
});
