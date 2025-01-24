import { JSONObject, JSONValue } from '../types/generic-types';

export const translateJsonObject = (jsonValue?: JSONValue): JSONObject | null => {
  if (typeof jsonValue === 'object' && !Array.isArray(jsonValue)) {
    return jsonValue;
  }
  return null;
};
