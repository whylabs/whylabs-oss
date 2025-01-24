export type NullableDate = Date | null;
export type NullableString = string | null;
export type NullishString = string | null | undefined;

// Type to use like Extract, but with better intelligence
export type ExtractUnion<T, U extends T> = U;

export type JSONValue = undefined | null | string | number | boolean | JSONObject | JSONArray;
export type JSONObject = {
  [x in string | number]: JSONValue;
};
export type JSONArray = Array<JSONValue>;

export type EmptyObject = Record<string, never>;

// Type used to remove undefined from union types i.e. make fields required
export type Concrete<Type> = {
  [Property in keyof Type]-?: Type[Property];
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? { [K in keyof T[P]]?: T[P][K] } : T[P];
};

export const translateJsonObject = (jsonValue?: JSONValue): JSONObject | null => {
  if (typeof jsonValue === 'object' && !Array.isArray(jsonValue)) {
    return jsonValue;
  }
  return null;
};
