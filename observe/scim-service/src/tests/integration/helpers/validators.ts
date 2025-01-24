import { ScimErrorResponse } from '../../../types';

export const notFoundValidator = (errResp: ScimErrorResponse): void => {
  expect(errResp.status).toBe(404);
  expect(errResp.scimType).toBe('invalidSyntax'); // this is odd but may not be easily fixable
  expect(errResp.detail).toContain('not found');
};

export const conflictValidator = (errResp: ScimErrorResponse): void => {
  expect(errResp.status).toBe('409'); // should be number not string - gateway issue
  expect(errResp.scimType).toBe('invalidSyntax'); // this is odd but may not be easily fixable
  expect(errResp.detail).toContain('already exists');
};

export const mutabilityValidator = (errResp: ScimErrorResponse): void => {
  expect(errResp.status).toBe(400);
  expect(errResp.scimType).toBe('mutability');
  expect(errResp.detail).toContain('cannot be modified');
};
