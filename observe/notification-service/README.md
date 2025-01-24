# Dependencies

## External dependencies - Required

* S3 bucket in env var METADATA_BUCKET for logging sent notifications
* AWS SQS queue in env var SIREN_NOTIFICATION_TOPIC for receiving notification events from dataservice
* AWS SQS queue in env var USER_MEMBERSHIP_QUEUE_NAME for receiving new membership events from songbird service
* AWS SQS queue in env var TEST_NOTIFICATION_QUEUE_NAME for receiving test notification events
* AWS SES service for sending emails

## Internal dependencies

* URL for the songbird service in env var SONGBIRD_API_ENDPOINT
* Role ARN for the songbird service in env var SONGBIRD_ROLE_ARN, if deployed in AWS


# Development

Run `yarn install` to install dependencies.

To build and run the project:

`yarn start`

To build and run the project against our production stack:

`DOTENV_PATH=.env.production yarn start:prod`

Once you see the message `Siren is alive!`, the service is ready to respond to messages.

Once the service is up, try sending one of the auto-generated sample messages (in ./sample-messages) to the SQS queue specified in the `local.ts` config file.

Stop the service with CTRL-C. Note this will take c. 10 seconds as it waits for the poll loops on the queues to complete.