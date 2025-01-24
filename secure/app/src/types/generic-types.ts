export type NullableString = string | null;
export type NullishString = string | null | undefined;

export type JSONValue = undefined | null | string | number | boolean | JSONObject | JSONArray;
export type JSONObject = {
  [x in string | number]: JSONValue;
};
export type JSONArray = Array<JSONValue>;

// Type used to remove undefined from union types i.e. make fields required
export type Concrete<Type> = {
  [Property in keyof Type]-?: Type[Property];
};
