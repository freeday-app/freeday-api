# :palm_tree: Freeday

A day-off manager powered by NodeJS, React, MongoDB and a Slack bot.

* [Contributing](#contributing)
  * [Issues management](#issues-management)
  * [Git branches management](#git-branches-management)
  * [Tests](#tests)
  * [Code quality](#code-quality)
  * [Documentation](#documentation)
  * [Slack ressources](#slack-ressources)
* [Deployment](#deployment)
  * [Dependencies](#dependencies)
  * [Nginx proxy](#nginx-proxy)
  * [Ngrok tunnel](#ngrok-tunnel)
  * [Logs directory](#logs-directory)
  * [Database](#database)
  * [Server configuration file](#server-configuration-file)
  * [Install and build](#install-and-build)
  * [Slack app configuration](#slack-app-configuration)
  * [Welcome course](#welcome-course)
* [Usage](#usage)
  * [Run the app](#run-the-app)
  * [Run tests](#run-tests)
  * [Run linters](#run-linters)
* [API](#api)
  * [Authenticating](#authenticating)
  * [GET arguments](#get-arguments)
  * [POST data](#post-data)
  * [Pagination](#pagination)
  * [Conflicts](#conflicts)
  * [Jobs](#Jobs)
  * [Errors](#errors)
  * [Swagger documentation](#swagger-documentation)
* [Logging](#logging)
  * [Mandatory fields](#mandatory-fields)
  * [Additional fields](#additional-fields)

## Contributing

### Issues management

* [Gitlab issues](https://gitlab.com/coddity/freeday/issues) are used to keep track of features to develop and bugs to fix
* Bufixes generally have a higher priority than new features
* If you are not sure about what to do just get in touch with those who are in charge of things

### Git branches management

* Use [Git Flow](https://danielkummer.github.io/git-flow-cheatsheet/) to manage the repository and keep things organized
  * We also use a minor custom branch type added to Git Flow: the `devfix` branches
* There are two main branches
  * `master` is the main branch and contains stable releases
  * `dev` is the development branch in which features are merged
* Four kind of branches can be created
  * `feature/[task-name]` for new features
    * Feature branches are created from `dev` and merged into `dev`
  * `devfix/[task-name]` for fixes that are not urgent and can wait a release, or fixes that concern code that exists only on the `dev` branch
    * Devfixe branches are created from `dev` and merged into `dev`
  * `hotfix/[task-name]` for urgent fixes on production code
    * Hotfixe branches are created from `master` and merged into `dev` and `master`
    * A hotfix branch should be tagged before merging into `dev` and `master`
  * `release/[version-tag]` for new releases
    * Release branches are created from `dev` and merged into `dev` and `master`
    * A release branch should be tagged before merging into `dev` and `master`
* Version tags must have a vX.X.X format (example: v1.2.3)

### Tests

* Back-end API tests are written using [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/)
* Front-end client end-to-end tests are written using [Playwright](https://playwright.dev/)
* When adding or changing features, write tests accordingly
* Any time you develop something, test the whole app to check if anything was broken (see [Run tests](#run-tests))

### Code quality

#### Coding conventions

* Use async/await & try/catch instead of Promises
* Put comments in your code, better to have too much than not enough
* Try to keep code as consistent as possible

#### Linters

* Linters are used on Freeday app to analyze code and detect bad practices / dirty code
* ESLint is used to analyze JS files following [AirBnB style guide](https://github.com/airbnb/javascript)
* StyleLint is used to analyze CSS files
* MarkdownLint is used to analyze the markdown readme file
* Any time you add code, run linters to analyze code quality (see [Run linters](#run-linters))

#### Editor extensions

* Most of code editors have extensions that help detecting code quality problems while coding
* Visual Studio Code has extensions for both ESLint and StyleLint
  * For StyleLint on VS Code use [this extension](https://github.com/stylelint/vscode-stylelint)
  * For ESLint on VS Code use [this extension](https://github.com/Microsoft/vscode-eslint)
    * In order to make it work you have to install all lint packages located in `package.json` globally
    * Be aware that most of the time you also have to add the ESLint working directory in VS Code's `settings.json` file like below:

```json
{
  "eslint.workingDirectories": [
    "./freeday"
  ]
}
```

### Documentation

* When developing new features or bringing changes to the app, please fill the documentation
  * In the main README.md file for general statements and functional information
  * In the Swagger project for API changes

### Slack ressources

* [Apps page](https://api.slack.com/apps)
* [Node SDK](https://github.com/slackapi/node-slack-sdk)
* [API methods](https://api.slack.com/methods)
* [Block kit builder](https://api.slack.com/tools/block-kit-builder)

[Back to top](#palm_tree-freeday)

## Deployment

### Dependencies

* This project runs best on Linux (although it may run on Windows with a few tweaks)
* [NodeJS](https://nodejs.org/en/download) >= 10 / <= 12 (prefer v12 LTS)
* [MongoDB](https://docs.mongodb.com/manual/installation) >= 4.0 / <= 4.2 (prefer 4.2)

### Nginx proxy

Freeday is designed to work behind a Nginx proxy. The Nginx configuration handles two locations:

* Requests starting with `/api` are proxied to the API Express app
* All other requests are proxied to the React client app

Below is the Nginx configuration files for production and development:

* Production

```nginx
# Change values in server_name
# Replace /path/to/ssl in SSL configuration
# Replace /path/to/freeday in the React client location
# If needed change the proxy_pass URL port in the API location

server {
  # http
  listen 80;
  listen [::]:80;
  # domains
  server_name subdomain.freeday.com;
  # https redirection
  return 301 https://$host$request_uri;
}

server {
  # https
  listen 443 ssl;
  listen [::]:443 ssl;
  # domains
  server_name subdomain.freeday.com;
  # ssl certificate
  ssl_certificate /path/to/ssl/fullchain.pem;
  ssl_certificate_key /path/to/ssl/privkey.pem;
  ssl_session_timeout 1d;
  ssl_session_cache shared:SSL:50m;
  ssl_session_tickets off;
  ssl_dhparam /etc/nginx/ssl/dhparam.pem;
  add_header Strict-Transport-Security "max-age=31536000";
  # react client
  location / {
    root /path/to/freeday/client/build/;
    try_files $uri /index.html;
  }
  # api server
  location ~ ^/api/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}

server {
  # https
  listen 443 ssl;
  listen [::]:443 ssl;
  # domains
  server_name cluster.freeday.com;
  # ssl certificate
  ssl_certificate /path/to/ssl/fullchain.pem;
  ssl_certificate_key /path/to/ssl/privkey.pem;
  ssl_session_timeout 1d;
  ssl_session_cache shared:SSL:50m;
  ssl_session_tickets off;
  ssl_dhparam /etc/nginx/ssl/dhparam.pem;
  add_header Strict-Transport-Security "max-age=31536000";
  # return a forbidden error for all routes except redirection
  location / {
    return 403;
  }
}
```

* Development

```nginx
server {
  listen 80;
  listen [::]:80;
  server_name local.freeday test.freeday;
  location / {
    proxy_pass http://127.0.0.1:8788;
  }
  location ~ ^/api/ {
    proxy_pass http://127.0.0.1:8787;
  }
}
```

When developing in local mode add this line to your `/etc/hosts` file:

```shell
127.0.0.1 local.freeday test.freeday
```

### Ngrok tunnel

* When developing in local mode you may want to try the Slack OAuth process or the Slack bot app
* You need to set up a tunnel with Ngrok so Slack OAuth or bot interactions can redirect to your machine
* Use the command below and browse to the generated Ngrok URL

```shell
ngrok http -host-header=rewrite local.freeday
```

* In order to complete the Slack OAuth process on a local environment
  * Check the redirect URL matches your Ngrok URL in Slack API settings (see [Slack app configuration](#slack-app-configuration))
  * Open Freeday with the Ngrok URL
  * Install the Slack app using the button in the Administration menu
  * When Slack OAuth process is done use the local URL again (local.freeday)

### Logs directory

* Log files are stored in the directory specified in the configuration file (see below)
* Logs directory must be created and have the proper permissions so the app can write log files in it

### Database

* Freeday app uses MongoDB as database system
* A MongoDB server needs to be available so the app can work as expected
* The MongoDB server needs to be configured as a Replica Set for the app to use transactions
* In local development mode you can perform the following steps to convert your MongoDB instance to a one node Replica Set (like described [here](https://docs.mongodb.com/manual/tutorial/convert-standalone-to-replica-set/)) :
* Add the following lines to your mongodb config file :

```conf
replication:
  replSetName: rs0
```

* Restart your mongod service
* Run the following command to initialize the Replica Set:

```shell
mongo --eval 'printjson(rs.initiate())'
```

### Server configuration file

* Copy `server/conf/conf.sample.json` to `server/conf/conf.json`
* Fill configuration in `server/conf/conf.json`
  * `publicUrl` *(Required)* Public URL on which Freeday is reachable (example: `https://freeday.domain.com/`)
  * `port` *(Optional)* Port on which server will run (default is `8787`)
  * `logDir` *(Optional)* Directory where logs will be stored (must have write permissions)
  * `mongoUrl` *(Required)* MongoDB URL (required, example: `mongodb://localhost:27017/freeday`)
  * `mongoTestUrl` *(Required)* MongoDB URL for test database (required, example: `mongodb://localhost:27017/freeday-test`)
  * `slack` *(Required)* Freeday's Slack app tokens, can be found on [Slack app page](https://api.slack.com/apps/) in the *Basic information* section
    * `clientId` *(Required)*
    * `clientSecret` *(Required)*
    * `signingSecret` *(Required)*
    * `accessToken` *(Required)*
  * `instance` *(Required)* The name or the label of this specific instance of Freeday
  * `dialogflow` *(Optional)* Configuration for the bot NLU (if block is missing Dialogflow will be disabled)
    * `keyfile` *(Required)* Location of the keyfile on the machine
      * Default is `./server/conf/dialogflow.json`
      * If the file is placed somewhere else the path must be absolute
    * `endpoint` *(Required)* Endpoint of the DialogFlow server
    * `project` *(Required)* Name of the DialogFlow project
    * `location` *(Required)* Region of the DialogFlow project
    * `environment` *(Required)* Environment of the DialogFlow project to use for NLU
    * `user` *(Required)* User name to connect with
    * `session` *(Required)* Any string
    * `language` *(Required)* Language of NLU
* If Dialogflow is enabled, a `dialogflow.json` file containing NLU authentication data must be placed into `server/conf`

Here's an example of a configuration file:

```json
{
  "publicUrl": "https://freeday.domain.com/",
  "port": "8787",
  "logDir": "/var/log/freeday",
  "mongoUrl": "mongodb://localhost:27017/freeday",
  "mongoTestUrl": "mongodb://localhost:27017/freeday-test",
  "slack": {
    "clientId": "49835475842.586204420879",
    "clientSecret": "12f458e4e2c5d1245a986b5782c0a15",
    "signingSecret": "45e182286bf455ac0a925de571c824",
    "accessToken": "xoxb-86082730184-10397473810-Gdbvnykg78iTHqvLaNflrkIm"
  },
  "instance": "odin",
  "dialogflow": {
    "keyfile": "./server/conf/dialogflow.json",
    "endpoint": "europe-west2-dialogflow.googleapis.com",
    "project": "xxxx",
    "location": "europe-west2",
    "environment": "Draft",
    "user": "xxxx",
    "session": "xxxx",
    "language": "fr"
  }
}
```

### Install and build

In order to install NPM dependencies and build React apps in `server`, `client` and `docs` directories, run:

```shell
# in production
npm run install-prod
# in development (will also install devDependencies)
npm run install-dev
```

### Slack app configuration

* Go to the [Slack apps page](https://api.slack.com/apps) to configure the Freeday Slack app of this instance
* Below you will find detailed information for each section of the Slack app configuration

#### Basic Information

* In this section you will find the *clientId*, *clientSecret* and *signingSecret* needed in the server configuration file

#### Manage Distribution

* The Slack app must be distributed so it can be installed to multiple workspaces

#### OAuth & Permissions

* In development mode you can use an Ngrok URL as the Redirect URL (see [Ngrok tunnel](#ngrok-tunnel)
* The Slack app needs these scopes:
  * chat:write
  * im:history
  * im:read
  * im:write
  * team:read
  * users:read

#### Interactivity & Shortcuts

* Interactivity must be enabled
* Request URL must be set to `https://[freedayDomain]/api/slack/events`
* In development mode you will need to use a Ngrok URL like `https://[ngrokId].ngrok.io/api/slack/events` (see [Ngrok tunnel](#ngrok-tunnel))

#### Event Subscriptions

* Events must be enabled
* The application must subscribe to the `message.im` bot event
* Request URL must be set to `https://[freedayDomain]/api/slack/events` (Slack bot must be running while changing this URL)
* In development mode you will need to use a Ngrok URL like `https://[ngrokId].ngrok.io/api/slack/events` (see [Ngrok tunnel](#ngrok-tunnel))

#### Collaborators

* In this section you can add other developers that need access to the Slack app configuration

### Welcome course

* If _users_ and _tokens_ MongoDB collections are empty an initialization token will be created and inserted in database
* A link to the welcome page will be displayed in the console
* Welcome course allows to create the first user

[Back to top](#palm_tree-freeday)

## Usage

### Run the app

#### Production

```shell
# run in production
npm run prod
```

* This command runs the API Express app
* API Express app port is defined in configuration file (default is 8787)
* React client is served by Nginx with its static build

#### Development

```shell
# run in development mode
npm run dev
# or if you don't want slack bot enabled
npm run dev-no-bot
```

* These commands run concurrently the API Express app and the React app in development mode
* API server port is 8787
* React client port is 8788
* Slack interactivity debug is enabled in console

#### Modes

##### Test mode

```shell
MODE=test node app.js
```

* Use this mode when running tests on Freeday app
* Therefore database will be named `freeday-test`
* Database is cleared every time app is started in test mode
* Slack bot is disabled and no calls are made to Slack API
* Logs level is set to error
* Use `MODE=test TEST_USER=username:password node app.js` to create a test user in database when starting the app
  * Username and password must be at least 6 characters long otherwise it will be ignored

##### Disable Slack bot

* Can be usefull to prevent Slack API limitations when restarting the app very often with *nodemon*

```shell
BOT=false node app.js
# or
BOT=disabled node app.js
```

### Run tests

In order to test the whole app you'll have to run:

```shell
# run all tests (API + React client)
npm run test
```

Alternatively you can use:

```shell
# run API tests only (Mocha)
npm run mocha
# run React end-to-end client tests only (Playwright)
npm run e2e
# open Playwright tests bowser window (for development)
npm run e2e-open
```

### Run linters

Check for bad practices and code problems by running linters:

```shell
# scans for problems
npm run lint
# auto fix problems if possible
npm run lint-fix
```

[Back to top](#palm_tree-freeday)

## API

### Authenticating

* Users must authenticate with `POST /auth` in order to get a valid token
* This token must be provided in the `Authorization` header while querying on the API

### GET arguments

* Some `GET` routes accept arguments filtering results
* These arguments must be sent as parameters in the URL
* Multiple arguments must be separated by `,` or `+`
* Example: `GET /daysoff?year=2018&type=a,b,c`

### POST data

* Any data sent to a `POST` route to create or modify a ressource has to be sent as `application/json` data

### Pagination

* Routes listing data return results with pagination
* When querying listing routes pagination GET parameters are available:
  * `page`: page number
  * `limit`: number of documents per page
* Set `page` to `all` to request all documents
* Examples:
  * `GET /daysoff?page=2&limit=50`
  * `GET /daysoff?page=all`

### Conflicts

* If daysoff have at least one day period in common there is a conflict
* Conflicts are only detected with confirmed or pending daysoff
* There cannot be conflicts with canceled daysoff
* Creations / modifications / confirmations can be force to avoid conflict detection

### Jobs

Freeday uses its own cron-like job service to run tasks

* Here are the currently available jobs:
  * `monthlyRecap`: Will send to every user a recap of their daysoff for the current mounth
* Every job can be enabled or disabled and has default settings which can be overwritten
* Here is the list of available settings for a job:
  * `enabled` | Defines if we should run the job
  * `dayOfMonth` | The day of the month during which we want the job to run
  * `hour` | The hour of the day we want to run this job at
  * `minute` | The exact minute we want to run this job at
  * `dayOfMonth`, `hour` and `minute` are strings and can be set with the value `*` if we want to run the job every day, hour or minute
* All activities on jobs such as setting modifications, successful execution, or failed execution are logged in a separate collection

### Errors

Errors thrown by the API come with:

* An HTTP status code
* A body containing:
  * `error` | An error message explaining what happened
  * `code` | An internal code identifying the error
  * `data` | *(Optional)* Error data

#### Internal codes

* **4000** Validation error (incorrect data sent)
* **4001** Submitted dayoff has no work days
* **4002** Dayoff end date is less than start date
* **4003** Page provided in request parameters is invalid or does not exist
* **4004** Dayoff type is disabled
* **4005** Slack referrer channel is not accessible to the bot
* **4010** Authentication failed
* **4011** Slack OAuth failed
* **4012** Wrong welcome secret code
* **4030** Forbidden action
* **4032** Bot language middleware could not identify the user language
* **4040** Item was not found
* **4090** Conflict with existing data
* **5000** Internal error

#### Examples

```json
{
  "error": "Intern error",
  "code": 5000
}
```

```json
{
  "error": "Invalid data",
  "code": 4000,
  "data": [{
    "name": "start",
    "in": "body",
    "error": "Missing required data"
  }, {
    "name": "end",
    "in": "body",
    "value": "wrongValue",
    "error": "Not of type Date"
  }]
}
```

### Swagger documentation

* API Swagger documentation is located in the `docs` directory and it contains:
  * Swagger YAML specification files
  * A React app serving Swagger-UI
* Public Freeday API documentation is available at [https://docs.freeday.coddity.com/](https://docs.freeday.coddity.com/)

[Back to top](#palm_tree-freeday)

## Logging

* Most actions performed by users are logged in the `statslog` collection
* Every log entry has 3 mandatory fields and other additional fields depending on its type

### Mandatory fields

* `timestamp`: Date and time of the entry.
* `interface`: How the action was performed. Possible values:
  * `client`: Action performed by an administrator through the web front-end client.
  * `bot`: Action performed by users on the bot or by the bot itself.
* `type`: Type of action. Some action types can only be done through one of the two interfaces. Possible values:
  * `login`:
    * Administrator logged in
    * `client` only
    * Additional fields: `user`, `ip`
  * `showhome`:
    * User sent a message to the bot which displayed the home page
    * `bot` only
    * Additional field: `slackUser`
  * `createdayoff`:
    * A day off was created
    * Additional fields:
      * `user` if interface is `client`
      * `slackUser`
  * `editdayoff`:
    * A day off was edited
    * Additional fields:
      * `user` if interface is `client`
      * `slackUser`
  * `listdaysoff`:
    * The bot displayed their list of days off to the user
    * `bot` only
    * Additional field: `slackUser`.
  * `confirmdayoff`:
    * A day off was confirmed
    * `client` only
    * Additional fields: `user`, `slackUser`
  * `canceldayoff`:
    * A day off was canceled
    * Additional fields:
      * `user` if interface is `client`
      * `slackUser`
  * `resetdayoff`:
    * A day off was reset
    * `client` only
    * Additional fields: `user`, `slackUser`
  * `notifyuser`:
    * The bot notified a user
    * `bot` only
    * Additional field: `slackUser`
  * `notifyreferrer`:
    * The bot notified a referrer channel
    * `bot` only
    * Additional field: `slackChannel`
  * `changelanguage`:
    * User changed their preferred language
    * Additional fields:
      * `slackUser` if interface is `bot`
      * `user` if interface is `client`
  * `changetheme`:
    * User changed their preferred theme
    * `client` only
    * Additional field: `user`
  * `editconfig`:
    * Administrator changed the configuration
    * `client` only
    * Additional field: `user`
  * `addadmin`:
    * Administrator account was created
    * `client` only
    * Additional field: `user`
  * `editadmin`:
    * Administrator account was edited
    * `client` only
    * Additional field: `user`
  * `removeadmin`:
    * Administrator account was removed
    * `client` only
    * Additional field: `user`
  * `adddayofftype`:
    * Day off type was created
    * `client` only
    * Additional field: `user`
  * `editdayofftype`:
    * Day off type was edited
    * `client` only
    * Additional field: `user`
  * `installapp`:
    * App was installed on a Slack workspace
    * `client` only
    * Additional field: `user`

### Additional fields

* `user`: ID of the administrator account that performed the action. Used by:
  * `login`
  * `createdayoff` (`client` only)
  * `editdayoff` (`client` only)
  * `confirmdayoff`
  * `canceldayoff` (`client` only)
  * `resetdayoff`
  * `changelanguage` (`client` only)
  * `changetheme`
  * `editconfig`
  * `addadmin`
  * `editadmin`
  * `removeadmin`
  * `adddayofftype`
  * `editdayofftype`
  * `installapp`
* `slackUser`: Slack ID of the user that performed the action or involved by the action. Used by:
  * `createdayoff`
  * `editdayoff`
  * `canceldayoff`
  * `showhome`
  * `listdaysoff`
  * `notifyuser`
  * `changelanguage` (`bot` only)
  * `confirmdayoff`
  * `resetdayoff`
* `ip`: IP address of an administrator. Used by `login`.
* `slackChannel`: Slack ID of a channel. Used by `notifyreferrer`.

[Back to top](#palm_tree-freeday)
