# WhyLabs SCIM Service

[[_TOC_]]

## scimgateway

We're using https://github.com/jelhub/scimgateway as a basis. This
module handles the basic protocol and lets you create a plugin
(or use one of a standard set) to
implement the scim actions.

The scimgateway does some standard pre- and post-processing of the request and response (e.g., putting results
in the correct fields, filtering for supported attributes, adding standard $ref/location fields). The plugins
perform the query/persistence needed to get, modify and delete users and groups.

I'm using orgId from the ApiKey to identify the account, but at some point we might want to use baseEntity in the URL
to do so. This would let us have different configs for different accounts if we needed it.

GOTCHAs:

We quite often need to patch scimgateway to fix its behavior. Check whether this is so before upgrading.

The latest patch is to surface the underlying http server so that we can run tests with `yarn test`, without
getting 'address already in use'. It also means we no longer need `--forceExit` on the jest run, although we
do need `--runInBand` because we cannot create multiple SCIM servers running in parallel. It also redacts logging
of the body.

### Patching the scimgateway

To patch the scimgateway, we need to:
* Make sure there are no uncommitted changes in the scim-service repo
* Run `yarn patch:scimgateway` to prepare to create a patch
* If there is already a patch, the output will show you the available packages to patch... rerun using the name of the unpatched scimgateway
  * Do not try to patch the patch as this does not work with our current version of yarn 
* `yarn install` to apply the original patch to `node_modules`
* Edit the patched file in `node_modules` directly - the key file to edit is `node_modules/scimgateway/lib/scimgateway.js`
  * Dont use an IDE that will reformat the file... just make the smallest changes necessary
* Test it works
* Copy your changed file from the scimgateway in `node_modules` to the folder it gives you
* Run the commit command `yarn patch-commit -s <folder>`
* The patch is saved as a diff file in `.yarn/patches` - make sure it doesnt have anything unexpected in it
* The `package.json` file should have a resolution pointing to the patch
* `yarn install` and check it works

Always make sure the patch is actually being applied (clear out the `node_modules` and check that the file is updated).
One specific thing to watch: the dependency string `"scimgateway": "4.4.5"` must exactly match the resolution key:
`"scimgateway@4.4.5": "patch:scimgateway...`. If it doesn't, the patch will not be applied. For example, if the
dependency is `"scimgateway": "^4.4.5"`, the caret must also be in the resolution key `"scimgateway@^4.4.5": "patch:scimgateway...`.


## plugin-songbird

The main logic for our SCIM handling is in `src/plugins/plugin-songbird.ts`. What's there is currently a
placeholder that partially implements the functions based on access to a single organization.

The `src/plugins/scimdef-v2.js` file overrides the information returned by the ServiceProviderConfig endpoint. It
needs to be a `.js`, which is why the tsconfig.json file has `allowJs`.

Main working assumptions:
* Only `Bearer <Token>` authentication is supported. The Token should be a WhyLabs API token.
* We need an "Account User" table in addition to the normal WhyLabs user table. 
  * This lets the provisioner create/update users before they are members of any organization.
  * It also lets us store the extra information that is expected in the SCIM protocol and/or by specific provisioners.
  * The account user details can be looked up given the whylabs user ID.
* Access to the provisioning API will be restricted by a new :account_administrator scope.
  * Only Administrators in the account organization should be able to create a key with this scope.
* We will map WhyLabs organizations and roles into groups as "<orgId>:<role>"
  * Provisioners should not create or delete the groups
* An Admin in the account organization can create an API key with `:account_administrator` scope in addition 
to the normal `:user` scope. This is currently enabled with the ACCOUNT_MANAGEMENT feature flag.

Known limitations (mainly in the underlying scimgateway):
* Does not have `created` or `lastModified` metadata fields
* Metadata `location` field incorrectly returns the internal DNS of the scim service
* Scim error responses with 404 code have a scimType of 'invalidSyntax'

## Existing customer adoption

The process should look like:
* We create a new account organization with an obvious name like '<CustomerName> Account'
* We add at least one user who will manage the account to this organization
* That user generates an API key and sets up the provisioner to manage the account administration users
and memberships
* Once that is working, the customer sets up users for a managed organization (ideally a non-critical one)
* We convert that organization into a managed organization
* Customer tests provisioning of memberships in that managed organization

## Run the service

```
yarn start
```

Service is exposed on port 8891.

## Run the service with local songbird

Set `SONGBIRD_API_ENDPOINT` to `http://localhost:8080`.

## Testing

### E2E with songbird

* `mock_provisioner.http` contains some test API calls for use with IntelliJ HTTP client.
* `http-client.env.example.json` contains variables for those test API calls. Copy to `http-client.env.json` and set
  the API key in the Bearer token in the songbird env.

UI/dashbird generates `:account_administrator` scoped API keys for the account organization. It continues to only
generate `:user` scoped API keys for the managed organizations.

### Testing with local songbird and proxy API

Set environment variables:

```
export SCIM_SERVICE_API_ENDPOINT=localhost:8891
export ENABLE_SECURITY=true
```

And run local songbird.

Use the `songbird-proxy` settings for the tests.

### Integration tests

In `src/tests/function` there are a set of integration tests that run local scim-service against songbird in dev.

These need to be run serially (`jest --runInBand`) because the gateway runs on the same port in each test suite process.

See [test README](src/tests/integration/README.md) for more details.

### Function/unit tests without songbird (runs in pipeline)

In `src/tests/function` there are a set of function tests that use [Mock Service Worker (msw)](https://mswjs.io/docs) to intercept and mock
songbird.

These need to be run serially (`jest --runInBand`) because the gateway runs on the same port in each test suite process.

## Debugging

One way to debug integration issues is to run the service with `yarn start`, run the node debugger,
and then use  `mock_provisioner.http` with the `songbird` (i.e. local service using songbird plugin) environment.
With this setup, it should stop on breakpoints in the plugin code and in the scimgateway code.

Another way is to debug the integration tests.


## Build

### Build and run the docker image locally

```
yarn build:container
yarn start:container 
```

This will run with the service exposed on port 8891 (the same as running locally).

### Build gotchas

Whenever the scimgateway module is installed, it creates a `lib` containing plugins,
a `config` containing wsdls, schema, docker files and certs; and an `index.js`.

This is great for getting started but a bit annoying after.
I've relocated our code into other paths and gitignored the generated stuff to make it easier to ignore.

I also converted the code to typescript from the original plain javascript. One fallout of this is that the
config file for the plugin has the weird name `src/config/plugin-songbird.ts.json` because the gateway does
not expect a `.ts` suffix to the plugin file and so does not strip it when generating the config file name.

Unfortunately, this does not work for the built code which is expecting a `dist/config/plugin-songbird.json`. For
now, I've simply copied the file to the correct place in the `yarn build` logic.

# Provisioning Flows

## Okta provisioning flow

Notes from a first pass through the Okta documentation about how the provisioner expects the SCIM source to
behave and where that may not align with what we have.

Is SCIM provisioning even supported? I think we are a custom app not an OIN app, and I _think_ that means
we would be defined through the AIW it is discussing here where it says not supported for OIDC SSO:
https://help.okta.com/en-us/Content/Topics/Apps/Apps_App_Integration_Wizard_SCIM.htm

Okta has a test suite that we might be able to use:
https://developer.okta.com/docs/guides/scim-provisioning-integration-prepare/main/#set-up-runscope


### Users

https://developer.okta.com/docs/reference/scim/scim-20/#scim-user-operations

Okta GETS the users (list or individual using userName filter), checks whether they're the ones it expects,
then uses POST to add the ones that don't exist. It expects pagination support.
It uses PUT to update the user details (not group). I'm assuming we will not be an OIN app and so it
won't use PATCH. It doesn't ever call DELETE; it instead sets the active attribute to false.

1. It requires user attributes that we don't support in the basic WhyLabs user

It requires us to support first and last name, and emails (multi-value) field.  
https://developer.okta.com/docs/guides/scim-provisioning-integration-prepare/main/#basic-user-schema

It _may_ also require us to support externalId, set to the same value as id.

2. It will push attributes that we don't support

Even if we don't support it, it will send attributes that we don't support, including a placeholder password!
We should ignore the password.

https://developer.okta.com/docs/reference/scim/scim-20/#create-the-user

3. May require active attribute and doesn't call delete on User

Not sure how we would handle this
https://developer.okta.com/docs/reference/scim/scim-20/#update-a-specific-user-patch
https://developer.okta.com/docs/reference/scim/scim-20/#delete-users

### Groups and Memberships

Okta has to be configured to push groups to allow admin of groups and memberships. There's not a way
to manage memberships without managing groups. Admin on groups seems a bit more manual so perhaps the
provisioner will be ok if the service returns groups that it doesnt know about???

4. Managing memberships seems to require support for creating groups

Can it work with a fixed set of groups?
https://developer.okta.com/docs/reference/scim/scim-20/#create-groups
https://help.okta.com/en-us/Content/Topics/users-groups-profiles/usgp-about-group-push.htm?cshid=ext_Directory_Using_Group_Push

5. Might expect to be able to change the group displayName

https://developer.okta.com/docs/reference/scim/scim-20/#update-a-specific-group-name

6. Okta may require patch replace op

https://developer.okta.com/docs/reference/scim/scim-20/#update-a-specific-group-name

If we're custom app integration then looks like it uses Put and always replaces. If we're OIN then it expects
to use patch and may want to use replace?

## Sailpoint provisioning

Sailpoint SCIM is via an IdentityIQ connector. I can't find any good info on how it provisions.

Seems like it will do a similar flow for users to sync attributes, but is less opinionated
on those attributes:
https://documentation.sailpoint.com/saas/help/provisioning/attr_sync.html

The connector mentions groups, so I guess it supports provisioning memberships. Cant find any details though.
https://documentation.sailpoint.com/connectors/identityiq/scim_2_0/help/integrating_scim2/configuration_parameters.html

At least it supports Bearer <API token>
https://documentation.sailpoint.com/connectors/identityiq/scim_2_0/help/integrating_scim2/iiq_api_auth_parameter.html

Seems like it may send attributes we don't expect unless configured to not do so, although this is just the
connector so maybe the attribute config is in Sailpoint
https://documentation.sailpoint.com/connectors/identityiq/scim_2_0/help/integrating_scim2/read-only_attributes.html



