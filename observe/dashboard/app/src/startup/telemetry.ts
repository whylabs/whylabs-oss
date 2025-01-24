import { DashboardStartupFunc } from './types';

// MANUAL FEATURE FLAG
const ALLOW_LOGS = false;

export const setupTelemetryMiddleware: DashboardStartupFunc<void> = async (app) => {
  if (ALLOW_LOGS) {
    // Function to transform high-resolution real-time into milisseconds
    const calculateHRTimeDiffInMillis = (startTime: [number, number]) => {
      const ONE_SEC_IN_NANOSEC = 1e9;
      const ONE_MILLIS_IN_NANOSEC = 1e6;
      const diff = process.hrtime(startTime);

      return (diff[0] * ONE_SEC_IN_NANOSEC + diff[1]) / ONE_MILLIS_IN_NANOSEC;
    };

    app.use((req, res, next) => {
      const startTime = process.hrtime();

      res.on('close', () => {
        const durationInMilliseconds = calculateHRTimeDiffInMillis(startTime);
        const { query, variables, operationName } = req.body ?? {};
        console.log(query, variables, operationName);
        console.log(`${req.method} ${req.originalUrl} [CLOSED] ${durationInMilliseconds.toLocaleString()} ms`);
      });

      next();
    });
  }
};
