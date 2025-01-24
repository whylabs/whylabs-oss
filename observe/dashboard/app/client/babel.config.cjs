module.exports = {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: 'current'
          }
        }
      ]
    ],
    plugins: [
      ["@locator/babel-jsx/dist", {
        env: "development",
      }]
    ]
  };
