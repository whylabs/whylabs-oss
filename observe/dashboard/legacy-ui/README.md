## Development guide

### Prerequisites to start the project

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

**Proceeding to run the application with Highcharts means you have read and acknowledged the Highcharts licensing statement above.**

### Starting the project

1. Run `aws sso login` to log in to AWS.

2. Install jq via brew if you haven't yet `brew install jq`

3. Run `yarn generate:remote` to generate graphQL queries using dev dashbird

4. Set the REACT_APP_DEV_BYPASS_KEY env var (see below) and run `yarn start`. This will build and run the project locally, while using the development instance of Dashbird service for GraphQL schema generation and queries.

If you want to run the front end side by side with a local instance of Dashbird, first start Dashbird locally, then run `yarn start:barebones` within this project. The front end will use your local instance of Dashbird to generate GraphQL schema and run queries.

### Running/testing GraphQL queries

#### Option #1 - Dashbird

Clone the Dashbird service and run it locally. See its readme for further instructions.

You can then either use Dashbird's GraphQL playground (at https://localhost:8080/graphql) or use your GraphQL plugin to connect to `Dashboard local` (see `.graphqlconfig`).

#### Option #2 - Use a GraphQL plugin/client for your IDE

Get a GraphQL plugin for your IDE. For WebStorm, you can use [this one](https://plugins.jetbrains.com/plugin/8097-js-graphql).

To bypass authentication when running queries from your IDE, you'll need to set the dev bypass key, so it can be sent in the request headers.
The dev bypass key must match the optional key configured as an AWS secret in dashbird. Set the REACT_APP_DEV_BYPASS_KEY environment
variable to the value of the secret.

Then set your endpoint to `Dashboard dev` (see `.graphqlconfig`) and try running a simple query through your IDE's GraphQL plugin. E.g.

```graphql
query {
  user {
    name # this should be Bob Bobberson
    isAuthenticated # this should be True
  }
}
```

(Your IDE may ask for the bypass key at this time, in which case you'll want to `echo REACT_APP_DEV_BYPASS_KEY` to copy and paste it)

If you see a `null` name, it's likely that your IDE is not setting the correct auth bypass header.

If you see the bypass user - fantastic, you can now run any queries you like and see data for the dev org. You may want to add the bypass key to your `~/.profile`, `~/.zshenv`, or equivalent bash profile file to set it permanently. See [this post](https://unix.stackexchange.com/a/117470) for more info.

Depending on your IDE and GraphQL plugin, you may need to re-enter the key every time you restart your IDE.

## Troubleshooting

### I see `Bad Request` when I start the project

Cause: Dashbird Dev is probably redirecting you to login, because you are not logged in to AWS and therefore failed to get the dev bypass token when running `yarn start`.

Solution: run `aws sso login`, then run `yarn start` again.

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
