import fs from 'fs';
import { getJsonSchemaReader, getTypeScriptWriter, makeConverter } from 'typeconv';

const reader = getJsonSchemaReader();
const writer = getTypeScriptWriter();
const { convert } = makeConverter(reader, writer);

async function startConverting() {
  await convertMonitorSchema();
  await convertDashboardSchema();
}

async function convertMonitorSchema() {
  const jsonBuffer = fs.readFileSync('./monitor-schema.json');
  const json = jsonBuffer.toString();
  await convert({ data: json }, { filename: './src/generated/monitor-schema.ts' });
}

async function convertDashboardSchema() {
  const jsonBuffer = fs.readFileSync('../schemas/exec-dashboard/dashboardConfiguration.json');
  const json = jsonBuffer.toString();
  await convert({ data: json }, { filename: './src/generated/dashboard-schema.ts' });
}

startConverting();
