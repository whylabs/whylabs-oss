import { JSONObject, JSONValue } from 'types/genericTypes';

export const translateJsonObject = (jsonValue?: JSONValue): JSONObject | null => {
  if (typeof jsonValue === 'object' && !Array.isArray(jsonValue)) {
    return jsonValue;
  }
  return null;
};

export const findLineByJsonKey = (rawJson: string, key: string, startPosition = 0): number => {
  const jsonLines = rawJson.split('\n');
  return jsonLines.findIndex(
    (line, i) => (line.match(/"(.*?)"/)?.[0] ?? '').includes(`"${key}"`) && i >= startPosition,
  );
};

export const getJsonPositionByError = (err: Error): number => {
  const parsePosition = Number(err.message.split(' ').pop());
  return parsePosition > 0 ? parsePosition : 0;
};

export const findLineByJsonPosition = (rawJson: string, position: number): number => {
  const jsonLines = rawJson.split('\n');
  let computedLength = 0;
  let lineIndex = 0;
  jsonLines.every((line, i) => {
    const currentLength = computedLength + line.length + 1;
    if (currentLength >= position + 1) {
      lineIndex = i;
      return false;
    }
    computedLength = currentLength;
    return true;
  });
  return lineIndex;
};
