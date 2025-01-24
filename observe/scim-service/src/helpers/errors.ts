// https://www.rfc-editor.org/rfc/rfc7644.html#section-3.12
type ScimRequestErrorName =
  | 'invalidFilter'
  | 'tooMany'
  | 'uniqueness' // This will result in 409 status
  | 'mutability'
  | 'invalidSyntax'
  | 'invalidPath'
  | 'noTarget'
  | 'invalidValue'
  | 'invalidVers'
  | 'sensitive';

// Scimgateway error handling in 4.1.15 changes so throwing a custom error no longer works

export const errorWithStatusCode = (message: string, code: number): Error => {
  const err = new Error(message);
  err.name = `${err.name}#${code}`;
  return err;
};

export const systemError = (message: string): Error => {
  return errorWithStatusCode(message, 500);
};

export const scimRequestError = (message: string, scimType: ScimRequestErrorName): Error => {
  const err = new Error(message);
  const code = scimType === 'uniqueness' ? 409 : 400;
  err.name = `${scimType}#${code}`;
  return err;
};
