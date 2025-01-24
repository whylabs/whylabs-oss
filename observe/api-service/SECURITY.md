# SECURITY

Songbird has two modes of authentication:
* API key: this is external facing
* AWS Identity: this is used for internal purposes only

This document describes how security works in Songbird

## Permissions

### APIs

By default, all API's (method with apporpriate annotations in controllers) are secured. In order to open up an api to be callable without requiring security it has to be annotated at the controller or method level with `@Secured(SecurityRule.IS_ANONYMOUS)`.

### Scopes
We currently have four scopes that we support (on top of "anonymous"):
* `:whylabs_administrator`: this is a human admin user
* `:whylabs_system`: for a trusted whylabs service
* `:administrator`: for the administrator of an organization
* `:user`: for the user within an organization

This design has been inspired by [Snowflake](https://docs.snowflake.com/en/user-guide/security-access-control-privileges.html).
However, we have simplified it significantly.

Before any operation is done, the service with check your identity against the **organization**.

We use `"0"` value to denote WhyLabs internal organization (this is the organization that `:whylabs_administrator` and `:whylabs_admin`
belong to). Users are NOT permitted to cross the organization boundary outside this special organizations.

### Roles

Scopes are translated to roles. Roles are applied on API level and will determined the final access control. So a
user might be authenticated, but might not have permission to call an API.

We have four roles that maps to the scopes:
* `WHYLABS_ADMINISTRATOR` and `WHYLABS_SYSTEM`: these are mapped to the two scopes above.
* `ADMINISTRATOR` and `USER`: these are required to access user's data.

Currently, `:whylabs_adminstrator` and `:whylabs_system` will lead to `ADMINISTRATOR` and `USER` roles (one caller might have
multiple roles!). A WhyLabs caller will likely have "WHYLABS_ADMINISTRATOR", "USER", and "ADMINISTRATOR" roles at the moment.
 
## Key Design
### API Key Security

* API keys are generated and returned to the user without storing the key on our side.
* We only store the prefix (10 characters), and the key hash (SHA256).
* Key hashes are unique across the system. I.e. if we generate a duplicate hash then we will try again. DDB 
conditional check is used to ensure that we don't accidentally override existing keys.
* For a given user, we can look up the list of key IDs.
* Key has expiration time (optional).
* Key has scopes (will be discussed separately). The scopes determine key permissions.
* The key length is 64 characters.
* User set `X-Api-Key` header when calling the service.

### AWS IAM 
* Using `X-Api-Key` as well
* Using AWS STS, the caller can generate a temporary credential without any permissions and create a JSON for it.
* The JSON looks like this (the fields are determined by STS response): 
```
{"AccessKeyId": "<access-key>", "SecretAccessKey": "<secret-key>", "SessionToken": "<secret-key>"}
```
* Songbird uses this to call AWS STS and will get the caller identity back, including account ID and session name
* Currently we check the account ID to ensure that the caller uses a credential from the same AWS account as 
songbird. If that's the case, the caller assume `WHYLABS_SYSTEM` role

