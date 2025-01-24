# Install

1. run `yarn install`
2. install visual studio code [live server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) _(Gives us hot reload functionality)_

if you want to upload changes to auth0 i'd suggest installing their [auth0 cli](https://github.com/auth0/auth0-cli)

# How to use

1. `cd` into ui-exp/projects/auth0-node
2. Run `yarn start` in your terminal
3. Start live server and choose /projects/auth0/index.html file (this gives us hot-reload feature)
4. Edit **.liquid.html** files under /components directory
5. Check output in **index.html** (or your local live server if you started it)

# Update branding template

1. run `auth0 login` command
2. login to appropariate tennant
3. run `auth0 branding templates update`
4. Copy and paste the entire `template.html` file into the text editor opened by the previous step.
5. If any updates were applied to `index.css`, the file must be uploaded to https://s3.console.aws.amazon.com/s3/object/whylabs-public?region=us-west-2&prefix=assets/auth0/index.css . We do not have bucket versioning enabled, so the old file should be moved to the `history` folder (same directory) and the old file overwritten.

## Important note:

If you update the `index.css` file, _you must also set its permissions to be public_. To do this, click on the file in the AWS S3 interface and go to the Permissions tab. Presently, this resides at [this permalink](https://s3.console.aws.amazon.com/s3/object/whylabs-public?region=us-west-2&prefix=assets%2Fauth0%2Findex.css&tab=permissions). The public must be able to read the file.

Auth0 expects us to provide single liquid template in here, take a look at **template.html** file inside this project. You should put appropariate customization inside each **if block**.

# Updating widget text prompts

1. run `auth0 login` command
2. login to appropariate tennant
3. run `auth0 branding texts update ${name of the page}`

To find names of the pages please visit [auth0 available variables docs](https://auth0.com/docs/customize/universal-login-pages/universal-login-page-templates#available-variables)

These texts get versioned under **texts** directory.

# 🚨🚨🚨🚨 Very important 🚨🚨🚨🚨

This whole environment was setup in order to have at least some kind of development enviorment for auth0 pages, there's a lot missing due to lack of time so it's important to read about all flaws and the way current **flow** works.

**Flow**

Right now the flow is not polished but its better than keeping everything in one file. Compiling pages and providing components with according props happens in **script.ts** file.

If you take a look at `getComponentMap` function you will notice that we import components and pages in there with `loadComponent` function. `loadComponent` function takes path of a component as a first parameter and everything else that comes after first param are component's dependencies(properties, arguments...).

If you take a look at return value of `loadComponent` you will notice that we only return pages, these pages that we return will be available in **app.liquid.html**

1. After you are finished with developing a page you would call it in **app.liquid.html**. For example body element in **app.liquid.html** should contain a page that you want to compile `<body> {{ loginPage }} </body>`.
2. After you save **app.liquid.html** file you should be able to see output in **index.html**.
3. 🚨🚨🚨🚨 **It's really important to remove development code from index.html. We do not need mock lock widget so we should remove code that is between `<!-- auth0 generated` comments**
4. If you make any changes to **.liquid.html** files **index.html** will get overwritten, So at this point when u sanitised **index.html** you should take that code and put it in **template.html** file.
5. **template.html** file contains code that is uploaded to auth0, if you take a look at contents of `<body>` element you will notice some more liquid template syntax which checks for propt.name(page that we are on) and servers correct page content.

Due to lack of time we unfortunately have to write css into single file called **index.css**.
Please try to keep **index.css** clean and separated by css comments, there are plenty of classes defined under appropriate comment blocks.
Some of the existing blocks in **index.css** :

- `/* Util classes */` _Contains classes such as container, common paddings..._
- `/* Typography classes */` _Contains classes such as titles and text_
- `/* COMPONENT STYLES */` _Between these tags are components styles separated by their own tag_
- `/* Signup page */` _Contains classes specific to signup page_
- `/* Login page */` _Contains classes specific to login page_
- `/* Forgot password page */` _Contains classes specific to forgot password page_
- `/* Media queries */` _Contains media queries_

# Contents

```
├── components # Contains components(liquid template) files that are used to compose template
│   ├── app.liquid.html # This file is where we include page that we want to render
│   ├── background.liquid.html
│	  ├── footer.liquid.html
│	  ├── forgotPassword.liquid.html # Contains all components that forgot password page displays
│	  ├── lock.liquid.html # Mimics auth0 lock widget, should be removed from index.html once compiled
│	  ├── login.liquid.html	# Contains all components that login page displays
│	  ├── logo.liquid.html
│	  ├── quoteblock.liquid.html
│	  ├── signup.liquid.html #Contains all components that signup page displays
│	  ├── tablet.liquid.html # Contains tablet and down view, currently we just hide everything
│
│   script.ts # Script used for compiling .liquid.html templates, output can be seen in index.html
│   template.html # Contains production ready code, where dev stuff is removed
└── ...
```

# TODO:

1. Make it so we don't define styles in same file(index.css)
2. Make it so we install ruby dependencies through gemspec file(similar to package.json)
3. Automate the process of copy pasting code from index.html to template.html
