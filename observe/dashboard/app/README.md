# Dependencies

## External dependencies - Required

* Auth0 application for authentication
* AWS Secrets Manager for storing secrets:
  * Auth0 secret containing clientId, clientSecret, mgmtDomain, loginDomain, sessionSecret

## External dependencies - Optional

* S3 bucket in env var METADATA_BUCKET for storing a maintenance banner
* AWS Secrets for Slack webhook for feedback or LLM secure signup
* AWS Secret in dev only for testing, containing dashbirdIntTestPassword, bypassKey, bypassUserId
* Cloudwatch log group for auditing admin operations in env vars AUDIT_LOG_GROUP and AUDIT_LOG_STREAM

## Internal dependencies

* URL for the dataservice in env var DATA_SERVICE_API_ENDPOINT
* URL for the songbird service in env var SONGBIRD_API_ENDPOINT
* Role ARN for the songbird service in env var SONGBIRD_ROLE_ARN, if deployed in AWS

# Setup

To run Dashbird locally, you will need to log in to AWS via SSO, using SDK V3. Remember to run `aws sso login` before running Dashbird.

If you see a `Missing credentials` error when trying to start the service, make sure you have an AWS profile set up
in your credentials file with access to.

# Development

## Prerequisites to start the project

**Highcharts licensing statement:** Some dashboards and graphs in this project use [Highcharts](https://www.highcharts.com/) API for rendering data visualizations. The project does not reference Highcharts as a dependency directly due to the restrictive licensing. Instead, you will need to purchase the correct [Highcharts License Type](https://shop.highcharts.com/) for your use case and agree to the Highcharts licensing terms. 

Then, to build the project **you must use the command below** to revert placeholder references to the original Highcharts references, and add the Highcharts dependencies to the project.  

> **Re-instating Highcharts references to the package and installing the Highcharts dependencies means you have read and acknowledge the Highcharts licensing statement above. Do not proceed if you don't agree to the statement.**

1. Run `yarn rename:placeholder-to-hc` to revert placeholder reference text back to the original Highcharts references.
2. Add specific versions of Highcharts as dependencies to the project:  
```bash
## Go to the app project directory
cd projects/app

## Install Highcharts dependencies
yarn add highcharts@11.2.0 highcharts-react-official@3.2.1
```

## Running the service

### WSL users

This section may only be needed for WSL users and may need changes to package.json scripts as `run caddy` has been dropped.

Install caddy and nss via brew with `brew install caddy nss`.

In WSL, you may need to run the following command to grant caddy permission to bind to port
443: `sudo setcap CAP_NET_BIND_SERVICE=+eip (readlink -f (which caddy))`

### All devs

Run `yarn` to install dependencies.

To build and run the project (both graphql and trpc stacks):

`yarn start`

If you want to run the service without watching for changes, use `yarn start:nowatch`

Once you see the message `Service is up on port XYZ`, the service is ready to respond to requests.

Once the service is up, visit http://localhost:8080/graphql to explore the graphql data. A sample query for you to try:

```graphql
query {
    models {
        id
        name
    }
}
```

## Running front end project side-by-side w/Dashbird

By default, Dashbird service will not serve the front end ui-exp bundle, instead redirecting you to the port on which the front
end is expected to be running during development (3000) (this behavior is controlled by the `NO_FRONT_END` env var).

You can start the front end package (ui-exp) along with Dashbird by running its `yarn start:barebones` script. Don't run
the default `yarn start` script in ui-exp, as it will result in the front end communicating with the deployed version of
Dashboard, instead of your locally running one.

## Debugging

The debugging flow depends on your IDE.

#### Mac

On a Mac, you can simply create a new debugger configuration of type `npm`, and set its package manager target to `yarn`
and the script to debug to `start`. You can then launch the app via the debugger and set breakpoints wherever.

#### WSL

In WSL, the recommended approach is via the remote debugger. Create a new debugger config of
type `Attach to Node.js/Chrome`, leave host and port at default values, and choose
the `Chrome or Node.js > 6.3 started with --inspect` option. Then start the service and launch the debugger.

## Serving the front end bundle

If you want Dashbird to serve the front end bundle, you have two options:

* Build the front end bundle (`yarn build` in ui-exp), copy the resulting files from `/ui-exp/projects/app/build` to
  Dashbird's `src/public` folder,
  run Dashboard's `yarn start:serve-client` script and then open it in the browser: http://localhost:8080

or

* Build and run the containerized version of Dashboard, which will include the front end

## Building and running the container

To build and run the container:

```
yarn start:container
```


## Authentication

When running locally, by default you have no identity, but see WhyLabs org data and have read/write permissions.

To log in, visit http://localhost:8080/login. To log out, visit http://localhost:8080/logout.

Login/logout will redirect to the locally running front end by default (port 3000), feel free to navigate back to
/graphql if you just want to use the GraphQL Playground

Run this query to make sure you're logged in or out properly:

```graphql
query {
    user {
        id
        name
        email
        organization {
            id
            name
        }
    }
}
```

### OpenID Connect

Dashbird uses OpenID Connect for normal authentication via Auth0. The `extractAuth0Context` middleware 
extracts the user's identity from the id token and puts it in the request object. Any downstream 
middleware should use `request.identity` and NOT `request.oidc.user` to access the user's identity.

This identity information is used in the `checkOrRefreshSessionMetadata` middleware to retrieve 
the latest role and membership information for the user and cache it in a session cookie. The
session metadata from this cookie is used downstream for permission checks and identifying the
current user. Downstream logic should use the session metadata and not the identity object,
so that impersonation works and to have the most recent roles/memberships. The identity
information can be up to 10 hours old (expiry time in Auth0), whereas the session metadata
is refreshed every minute.

### Token Authentication

The `extractAuth0Context` middleware also allows for token-based authentication in development, using the
`Authorization` header with a Bearer token. This is being used in the integration tests along with dev bypass,
see `setupTestUser`.

### Dev bypass

Dev bypass allows ui-exp to be tested directly against dev dashbird, using the bob@whylabs.ai
account. It is only permitted when the stage is local or development, and where header
X-WHY-BYPASS-TOKEN is set to a secret value.

When the bypass header is detected, the `extractAuth0Context` middleware sets the `request.identity`
object to contain the OpenIdUser object for bob. This allows the user to be treated as authenticated.

To test changes that may impact dev bypass, update the env variable in the ui-exp `yarn start` command
to `REACT_APP_DASHBOARD_URL=http://localhost:8080`.

### Impersonation

Impersonation allows a user to log in as another user, provided they have the `WhyLabs Admin` role in Auth0.

Impersonation mode is entered by setting an `impersonation` object in Auth0 app_metadata for the impersonating user.
The `impersonation` object contains the `id` of the user being impersonated and an expiration time. 
The `checkOrRefreshSessionMetadata` middleware retrieves the metadata for the user being impersonated and
sets it in the session metadata, so that downstream logic works on the impersonated user 
(unless explicitly checking for impersonation information).

### Debug Production

Debug production allows a user to impersonate another user in production while running dashbird locally, provided they have 
production AWS credentials, WhyLabs Admin role in Auth0 and the locally running dashbird is setup with production 
environment variables. 

To run in debug production mode, you will need to use `k-prod-connect` to connect to the production k8s cluster.

Debug mode is entered when the `DEBUG_USER_ID` environment variable is set to the WhyLabs ID of the user to impersonate.
The user's WhyLabs Admin role is checked once at app startup using `checkIsWhyLabsAdmin` to check the user's AWS email
in Auth0.

On requests, the `extractAuth0Context` middleware sets the `request.identity` to contain a constructed debug 'real' user.
The `checkOrRefreshSessionMetadata` middleware then processes the request as if it were an impersonation request.

## Running integration tests

```
yarn test:integ-sso 
```

Graphql tests are under `src/tests`. They rely on specific data setup in the database and so are illustrative only.

For debugging songbird/dataservice failures in tests, uncomment the line to set
`process.env.ENABLE_CALL_LOG` in `tests/call-logging.ts` and run the problematic test.
The calls to songbird/data service will be captured in dataservicecalls.log and songbirdcalls.log.

## Secrets

Secrets are stored in AWS Secret Manager. Dashbird is deployed with policies that allow it to read secrets with
a standard prefix of `development/dashbird` or `production/dashbird`, depending on the environment. If you add secrets
with other names, you will need to add a new policy statement to the deployment automation.

The following secrets are currently stored in AWS Secret Manager. See `SecretTypes` in services/secrets for their fields:
* Testing - only set in dev
  * The dashbirdIntTestPassword secret is the password associated with the dashbird-int-test@syzygy.ai user in dev
  * The bypassKey is only held in the secret manager, and can be changed
  * The bypassUserId should be the auth0 ID of bob@whylabs.ai
* Feedback - webhooks for Slack channels feedback-dev and feedback-enterprise (optional)
* SecureForm - webhooks for Slack channels secure-trial-request-dev and secure-trial-request-prod (optional)
* Auth0 (required)
  * The Auth0 clientId, clientSecret and mgmtDomain are obtained from the Auth0 Applications used to secure the UI - see settings page for the application
  * The loginDomain is under custom_domains in the Auth0 dashboard
  * The sessionSecret is a random string used to sign the auth0 cookie. If you change this, you will invalidate existing sessions.


## Checking for unused dependencies

Run `depcheck` to see if there are any unused dependencies that are safe to remove.

NOTE: It will (wrongly) determine certain packages to be unused, if they're only used in scripts (
e.g. `@graphql-codegen` and `depcheck` itself).

## Gotchas

### Adding new schema and resolver files

All schema and resolver files must be listed in `schema-factory.ts` at the moment. If you don't list them, your newly
added types will not show up on `/graphql` and/or your resolvers will not be reachable, returning the default `null`
instead.

### Adding new fields to the Mutation object

If you add a new field at the top of the Mutation or Query object, don't forget to add a resolver for it
in `mutation-resolvers.ts` or `main-resolvers.ts` (respectively), otherwise your newly added field will return `null`.

Example, you're adding this:

```graphql
type FooManagement {
    bar: Boolean
}

extend type Mutation {
    foo: FooManagement
}
```

You _must_ go into `mutation-resolvers.ts` and add `foo: () => ({})` (returning an empty object) in order for the
resolvers of type `FooManagement` to be reachable, even if _those_ resolvers are already specified in `foo-resolvers.ts`
.

This makes sense, because a query like `mutation { foo { bar } }` will first try to run the `foo` resolver, which would
not exist unless it is declared on the `Mutation` type. Once the `foo` resolver completes and returns a non-null value,
GraphQL will run the resolver for `bar` on `FooManagement`.