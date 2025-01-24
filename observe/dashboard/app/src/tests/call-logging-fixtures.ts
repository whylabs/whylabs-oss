import { logToAllCallStreams } from './call-logging';

if (process.env.ENABLE_CALL_LOG) {
  beforeEach(function () {
    logToAllCallStreams(JSON.stringify({ test: this.currentTest?.fullTitle(), state: this.currentTest?.state }));
  });

  afterEach(function () {
    logToAllCallStreams(JSON.stringify({ test: this.currentTest?.fullTitle(), state: this.currentTest?.state }));
  });
}
