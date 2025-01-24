# Setup

You need to get a [GitLab access token](https://gitlab.com/-/profile/personal_access_tokens) with the `api` scope in
order to pull down
our private code from GitLab and set it to the `NPM_TOKEN` env variable.

```bash  
# bash/zsh
export NPM_TOKEN="token"

# fish
set -Ux NPM_TOKEN "token"

# inline
NPM_TOKEN=token yarn install
```

You will also need to log in to AWS via SSO. Run `aws sso login`.

SSO logins may not work properly on all configurations. Resolving this probably requires upgrading `aws-sdk` to v3 and
utilizing `@aws-sdk/credential-providers`
e.g. `npm i @aws-sdk/credential-providers` [link](https://www.npmjs.com/package/@aws-sdk/credential-providers) package
to add `fromSSO` as a credentials provider. SDKv2 does not support SSO by default, and our hacky third party util-based
approach does not seem to work for everyone.


# Development

## Prerequisites to start the project

**Highcharts licensing statement:** Some dashboards and graphs in this project use [Highcharts](https://www.highcharts.com/) API for rendering data visualizations. The project does not reference Highcharts as a dependency directly due to the restrictive licensing. Instead, you will need to purchase the correct [Highcharts License Type](https://shop.highcharts.com/) for your use case and agree to the Highcharts licensing terms.

Then, to build the project **you must use the command below** to revert placeholder references to the original Highcharts references, and add the Highcharts dependencies to the project.

> **Re-instating Highcharts references to the package and installing the Highcharts dependencies means you have read and acknowledge the Highcharts licensing statement above. Do not proceed if you don't agree to the statement.**

1. Run `yarn rename:placeholder-to-hc` to revert placeholder reference text back to the original Highcharts references.
2. Add specific versions of Highcharts as dependencies to the project:

```bash
## Go to the app project directory
cd client

## Install Highcharts dependencies
yarn add highcharts@11.2.0 highcharts-react-official@3.2.1
```

**Proceeding to run the application with Highcharts means you have read and acknowledged the Highcharts licensing statement above.**

## Error Handling

If you need to surface a new user-facing error:
* Add a new DashbirdErrorCode
* Run `yarn generate` so that the code is available in the generated types
* Create a new error class extending ServiceError that uses the new code
* If this new error should be logged as warn rather than error, add it to the list in errorCodeToLogLevel 
* For API errors that are specific to one or two API calls, catch the API call where you make it in the data source layer and map them to the service error
* For API errors that are more general, there is the option to map them in mapDataServiceQueryError. Use this cautiously: it is called for both songbird and dataservice.
* For errors raised in the trpc server stack, I suggest subclassing ServiceError and using the DashbirdErrorCode enumeration to ensure we have unique codes


## Monorepo:

Initialize the setup: `yarn monorepo:init`

Run the dev server: `yarn start`

> _Note that the express server is under `localhost:8080` and the client is under `localhost:3030`_

## Running the service

### All devs

Run `yarn` to install dependencies.

To build and run the project:

`yarn start`

Once you see the message `Service is up on port XYZ`, the service is ready to respond to requests.

## Debugging

The debugging flow depends on your IDE.

### VSCode

// TODO

### WebStorm

#### Mac

On a Mac, you can simply create a new debugger configuration of type `npm`, and set its package manager target to `yarn`
and the script to debug to `start`. You can then launch the app via the debugger and set breakpoints wherever.

## Serving the front end bundle

* Build and run the containerized version of Dashboard, which will include the front end

## Building and running the container

To build and run the container:

Run `yarn start:container`
