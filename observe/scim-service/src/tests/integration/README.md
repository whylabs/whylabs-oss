# Running the integration tests

Set the environment variable ACCOUNT_API_KEY to an API key for the account organization
specified in `config.ts`.

Run the tests using:
```
ACCOUNT_API_KEY=xxxx yarn test:integ 
```

To debug in IntelliJ, make sure the Jest run config specifies the 
`/Volumes/Workspace/scim-service/jest.integ.config.ts` configuration file, and set the ACCOUNT_API_KEY env var.

You can use an API key for a different organization, but note these tests WILL change memberships, so pick an
organization with care, and update the accountOrgId in `tests/integration/config.ts`.

You can also run these tests directly against the deployed SCIM API in dev by changing the basePath in
`tests/integration/helpers/requests.ts`.

To run with local songbird, set SONGBIRD_API_ENDPOINT.

NOTE: A variant of these tests were copied into api-testing in the dashboard-service-infrastructure repository
to run in the pipeline. These tests are left here primarily for testing convenience. If you write more tests, 
add them to the dashboard-service-infrastructure repository.
