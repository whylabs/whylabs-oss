import * as useWhyLabsSnackbarHook from '../useWhyLabsSnackbar';

export function mockUseWhyLabsSnackbar(): jest.SpyInstance {
  return jest.spyOn(useWhyLabsSnackbarHook, 'useWhyLabsSnackbar').mockReturnValue({
    enqueueSnackbar: jest.fn(),
    enqueueErrorSnackbar: jest.fn(),
    cleanQueue: jest.fn(),
  });
}
