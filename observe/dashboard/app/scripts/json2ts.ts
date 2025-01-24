import fs from 'fs';

import { getJsonSchemaReader, getTypeScriptWriter, makeConverter } from 'typeconv';

const reader = getJsonSchemaReader();
const writer = getTypeScriptWriter();
const { convert } = makeConverter(reader, writer);

const convertMonitorSchema = async () => {
  const jsonBuffer = fs.readFileSync('./src/schemas/monitor-schema.json');
  const json = jsonBuffer.toString();
  await convert({ data: json }, { filename: './src/schemas/generated/monitor-schema.ts' });
};

const convertPoliciesSchema = async () => {
  const jsonBuffer = fs.readFileSync('./src/schemas/llm-policies-json-schema.json');
  const json = jsonBuffer.toString();
  await convert({ data: json }, { filename: './src/schemas/generated/llm-policies-schema.ts' });
};

(async () => {
  await convertMonitorSchema();
  await convertPoliciesSchema();
})();
