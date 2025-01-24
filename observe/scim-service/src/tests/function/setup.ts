import { init } from '../../plugins/plugin-songbird';

const scimServer = init();

// Clean up after the tests are finished.
afterAll(async () => {
  if (scimServer) {
    scimServer.close();
  }
});
