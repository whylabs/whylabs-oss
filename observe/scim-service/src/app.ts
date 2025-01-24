//
// ScimGateway plugin startup
// One or more plugins can be started (must be listening on unique ports)
// Sourced from https://github.com/jelhub/scimgateway/tree/master/lib
//
// import './plugins/plugin-loki';
import { init } from './plugins/plugin-songbird';
init();
// import './plugins/plugin-scim';
