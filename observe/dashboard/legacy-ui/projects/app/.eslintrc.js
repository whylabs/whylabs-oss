
const { specifiedRules } = require('graphql');

/**
 * This is a workaround for getting rid of GraphQL unhelpful lint errors
 * ref: https://github.com/apollographql/eslint-plugin-graphql/issues/19
 *
 * NoUnusedVariablesRule - rule is unable to recognize that variables are used inside fragments
 *
 * NoUnusedFragmentsRule - graphql specification specifies that defined fragment should be used at least once
 *   unfortunantley eslint fails to detect fragments that are used in other files
 *
 *  KnownFragmentNamesRule - this issue realates to NoUnusedFragmentsRule, basically a fragment that is being spread(...Fragment)
 *    must be defined in the same file
 */
function filterBrokenRules() {
  const ignoreRules = ["NoUnusedVariablesRule", "NoUnusedFragmentsRule", "KnownFragmentNamesRule"];

  const validators = specifiedRules
    .map(rule => rule.name)
    .filter(ruleName => {
      if(ignoreRules.includes(ruleName)) return false

      return true
    });

  return validators
}

const validators = filterBrokenRules();

module.exports = {
  "extends": [
    "../../.eslintrc"
  ],
  "plugins": [
    "graphql"
  ],
  "rules": {
    "react/jsx-uses-react": "off",
    "no-console": "off",
    "jsx-a11y/no-onchange": "off",
    "react/react-in-jsx-scope": "off",
    "graphql/template-strings": [
      "warn",
      {
        "env": "literal",
        "schemaJsonFilepath": "graphql.schema.json",
        validators
      }
    ],
    "graphql/no-deprecated-fields": [
      "warn",
      {
        "env": "literal",
        "schemaJsonFilepath": "graphql.schema.json",
      }
    ]
  }
}
