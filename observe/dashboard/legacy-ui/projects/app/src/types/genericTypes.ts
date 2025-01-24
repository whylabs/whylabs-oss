export type NullableString = string | null;
export type NullishString = string | null | undefined;

// Type to use like Extract, but with better intelligence
export type Extends<T, U extends T> = U;

export type JSONValue = undefined | null | string | number | boolean | JSONObject | JSONArray;
export type JSONObject = {
  [x in string | number]: JSONValue;
};
export type JSONArray = Array<JSONValue>;

export type EmptyObject = Record<string, never>;

export interface MouseBounds {
  mouseX: number;
  mouseY: number;
}
