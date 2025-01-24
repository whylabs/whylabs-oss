## External Dependencies - Required

* AWS S3 Bucket for storing files including uploaded profiles
* AWS DynamoDB for storing data, with tables for api keys, data (reference profiles), global actions and metadata (organizations, memberships, etc)
* AWS SQS queues for:
  * test notifications
  * user membership notifications
  * aws marketplace subscriptions
* AWS Kinesis Stream for processing schema changes to uploaded profiles
* AWS Secrets Manager for storing secrets:
    * AzureSecretName - used for authenticating with Azure for traces
* AWS Elasticache (Redis) for caching
* Azure Data Explorer for storing traces


## External Dependencies - Optional

* A GCP account with a bigquery table to be used for audit
* CloudFront signer for signing URLs
* AWS Secrets Manager for storing secrets:
  * GCPSecretId - The secret for the GCP service account that is used for audit logging to bigquery
  * CfSignerSecretId - The secret for the Cloudflare signer

## Internal Dependencies

* Data Service - for storing and retrieving data (Required)
* Scim Service - for managing users and memberships using the SCIM Protocol (Optional)
* Smart Config Service - for monitor recommendations (Optional)

## Development
* Requires OpenJDK 9+
* Install `gdub` ([Github](https://github.com/gdubw/gdub)). It makes interacting with Gradle less painful (not required).
All the following `gw` command can be replaced with `./gradlew` from the root of the project.

```bash
brew install gdub
```
* Run the server with `gw run` and see all tasks with `gw tasks`.
* While running, use the request builder by navigating to `localhost:8100/swagger-ui`.

### Code style
* We use Kotlin Lint:
```
gw ktlintCheck
```
* If the code is not formatted, you'll fail the `gw check` run
* Fix formatting with
```
gw ktlintFormat
```
* Run `gw ktlintApplyToIdea` to configure intellij to format in the way that ktlint wants us to.
* You should run this command that adds Git pre-commit hook, that runs ktlint format over staged files and adds
fixed files back to commit.
```
gw addKtlintFormatGitPreCommitHook
```
* See [ktlin](https://github.com/JLLeitschuh/ktlint-gradle) documentation for more information

### IDE Setup
* IntellIJ Ultimate is recommended. Ping Andy for license (you can start with 30 day trial for the enterprise license)
* We use Kotlin lint. Run the following command to set up your IDEA formatting:
```
gw ktlintApplyToIdea
```

### Build prerequisites

You need to get a [GitLab access token](https://gitlab.com/-/profile/personal_access_tokens) with the `read-api` scope in 
order to pull down our private code from GitLab and set it to the `NPM_TOKEN` env variable.

This access token can also be used for Dashbird, which is why the odd choice of `NPM_TOKEN` when in 
this case it's being used to access a maven repository API for the java data service client.

```bash
# bash/zsh
export NPM_TOKEN="token"

# fish
set -Ux NPM_TOKEN "token"

# inline
NPM_TOKEN=token yarn install
```

### Getting started
* We generate a Java client alongside with the code to enable integration testing
* The code will fail to compile in your IDE until you run the `build` target:

```
gw build
```
* Check `client/src` for the source code for the OpenAPI
* You should run this everytime you change the API
* To run the integration tests, call (the tests are skipped if `integTests` property is not set)
```
gw -PintegTests test
```
* To run a specific integration test:
```
gw -PintegTests :client:test --tests 'NameOfTestClass.name of test'
gw -PintegTests :client:test --tests 'NotificationApiTest.updating daily notifications works'
```
Results of the tests will be included in the generated HTML report, located at `./client/build/reports/tests/test/index.html`

Specify `-Prerun` to force the tests to rerun even if there is no change since they last ran successfully.

To run integration tests that call dataservice locally, you will need to set DATA_SERVICE_API_ENDPOINT.

## Building and testing
* Building the distribution
```
gw installDist
```
* Distribution should be built under `build/install`
* Test the project
```
gw check
```

## Integration tests

- Install openjdk 15+, we use some dependencies that aren't found in lower versions.
- Install the latest aws cli. There are often issues between the java libraries we use from aws and the older cli versions.
- Setup SSO with `aws sso login` and refresh before running tests.

If you're running tests within the IDE then you need to make sure you configure it correctly there.

The integration tests depend on the generated kotlin client being up to date. You can build the client locally with `gw generateKotlinClient`. If you see compilation errors while generating the client then you may have an older generated client on disk from before some files were refactored/moved. Try to `rm -r ./client/src/main/kotlin/` and see if that fixes it.

## Running

### Running locally

You need active AWS credentials (`aws sso login`) so that a locally running songbird can interact with the dev environment. Your locally 
running songbird will pull and process SQS messages; read/write to S3, and read/write to DynamoDB
just like the deployed dev songbird instances.

```
gw run
```

To connect to the data service running in kubernetes, you will need to do some further setup. Follow the instructions
[here](https://whylabs.atlassian.net/wiki/spaces/EN/pages/1581580289/EKS+101) to connect to the dev EKS cluster. 
Then either use the approach described there for port-forwarding or install [telepresence](https://www.telepresence.io/docs/latest/quick-start/)
and use `telepresence connect`.

With port-forwarding, set DATA_SERVICE_API_ENDPOINT in `.env` to `http://localhost:8090`

With telepresence, DATA_SERVICE_API_ENDPOINT should be set to `http://dataservice-main-k8s.datastack.dev.whylabs`

With tailscale: `http://dev-dataservice`

### Setting up your personal stack

Please create a personal stack from [dashboard-service-infrastructure](https://gitlab.com/whylabs/infrastructure/dashboard-service-infrastructure)
for `songbird`.

You'll need AWS credentials + your personal stack in pulumi:
```
brew install pulumi
git clone git@gitlab.com:whylabs/infrastructure/dashboard-service-infrastructure.git
cd dashboard-service-infrastructure
yarn install
cd packages/songbird
export PULUMI_ACCESS_TOKEN="ping-Andy-for-a-token"
pulumi stack init personal-${USER}
pulumi stack ls

export AWS_ACCESS_KEY_ID="See https://whylabs.awsapps.com/start#/"
export AWS_SECRET_ACCESS_KEY="See https://whylabs.awsapps.com/start#/"
export AWS_SESSION_TOKEN="get this for development account from https://whylabs.awsapps.com/start#/"

pulumi preview # run preview
pulumi up # run deployment
```

Once deployed, you can extract the table information required to run songbird as follows:

```
pulumi stack output environment
```

You'll get:
```
export STAGE=development # DO NOT INCLUDE THIS KEY
export BASE_URL=...
export ENCRYPTION_KEY=..
export METADATA_TABLE=..
export DATA_TABLE=...
export API_KEY_TABLE=...
```

**Ensure you don't export STAGE as you'll need proper authentication for the local mode**

Paste the results from the previous step into the `/service/.env` file.

```
BASE_URL=https://p-andy-songbird.personal.whylabsdev.com
ENCRYPTION_KEY=4d29d9c4-6b41-4e84-9c11-cd3a5b191c0a
UPLOAD_TABLE=p-andy-songbird-UploadTable-4889097
METADATA_TABLE=p-andy-songbird-MetadataTable-45c6168
DATA_BATCH_METADATA_TABLE=p-andy-songbird-DataBatchMetadata-e73890f
DATA_BATCH_MERGE_TABLE=p-andy-songbird-DataBatchMerge-7429c4f
API_KEY_TABLE=p-andy-songbird-ApiKey-22dc070
STORAGE_BUCKET=p-andy-songbird-20201016210646262900000001
```

You'll also need:
```
# AWS configuration exported via https://whylabs.awsapps.com/start#/ -> Development -> DeveloperFullAccess
AWS_PROFILE=207285235248_DeveloperFullAccess
AWS_REGION=us-west-2
```

The **207285235248_DeveloperFullAccess** is my AWS credentials in `~/.aws/credentials`. Unfortunately AWS Java SDK
doesn't support SSO credentials (via `aws sso login`) so you'll have to create a file following the instruction on our AWS sign on portal.

* Run Gradle with `develop` target and `--continuous` flag. This will restart the server everytime you
make a code change
```
CLOUDWATCH_NAMESPACE=local-songbird-metrics gw develop --continuous
```

You can change the port that Songbird is running on by adjusting the `port` value in `application.yml`.

* You can hook into the remote debugger by creating a remote debugging run configuration in IntelliJ targeting
port `5005`. See [remote debug](https://www.jetbrains.com/help/idea/tutorial-remote-debug.html) for more info
on how to set it up.

## Building and testing the container
 * First run `gw build` at the top level.

 * To build the container, from `service` path:
```
docker build -t songbird .
```

* To run the container so it can be tested locally:
```
docker run -p 8080:8080 -v $HOME/.aws/:/root/.aws/ -it --rm -e CLOUDWATCH_NAMESPACE=local-songbird-metrics -e AWS_PROFILE=207285235248_DeveloperFullAccess
 --env-file .env songbird
```
Note that `/service/.env` contains example environment variables that should be updated to your settings.

If you are running on a different port, change the `-p` option. The `AWS_PROFILE` must be a non-SSO account.

If you are using an M1 Mac, you may need to do some extra steps to build and run because the base image does not have an arm
build so you need to force it to build and run under emulation.

* Edit the Dockerfile FROM to add a platform override and then build using the command above:
```
FROM --platform=linux/amd64 amazoncorretto:17-alpine-jdk
```

* Add a similar override on the docker run:
```
docker run -p 8080:8080 --platform=linux/amd64 -v $HOME/.aws/:/root/.aws/ -it --rm -e CLOUDWATCH_NAMESPACE=local-songbird-metrics -e AWS_PROFILE=207285235248_DeveloperFullAccess --env-file .env songbird
```


# Gotchas
The tools we're using in this package have a lot of gotchas that you need to keep in mind. When you see mysterious error messages then you should see if the cause is in this list and/or add it to this list if it makes se nse.

- Micronaut doesn't automatically escape text in url paths. So, you can't put something like an email address in a path in a controller because it might have a `+` in it, which would change the route definition implicitly and make the controller uncallable from generated clients.
- Whenever you hit mysterious 403 errors when calling songbird, chances are that you defined the api endpoint in such a way that it can't be correctly identified. For example, setting the consumes/produces to octet stream and testing out the api in the swagger ui might work while generating a client that fails to call the right endpoint. Anything that can't be "matched" ends up as 403 because our auth doesn't know how to authenticate it.
- You can't return lists for some reason. You have to wrap them objects in the api. If you return a list you'll get some error in the generated jvm clients about not being able to cast a map to an object when you access a list item.
- If you add getters to an item that is used to model a dynamo table then you have to @DynamoDBIgnore it or dynamo will assume it's a getter for an attribute and attempt to include it in the table during writes.
- You apparently cannot just return nothing.
- If you use a return type of MediaType.APPLICATION_JSON then micronaut might fail to be able to match the route, which means you'll get 403 back for no reason.
- Gradle reuses daemons. If you need to export a new environment variable, run `gw --stop` first and make sure the variables are defined in each shell you run gradle from.

