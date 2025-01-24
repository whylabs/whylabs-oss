## Set up

* JDK 1.8.
* Download Druid 0.20.x locally from https://druid.apache.org/
* Extract to a local path. Call it `$DRUID_HOME`
* Create an extension folder under `$DRUID_HOME/extensions/druid-whylabs`
* Build the jar bundle with: `./gradlew shadowjar` (recommend that you
  get https://github.com/gdubw/gdub)
* Go to the `whylabs` extension folder. Symlink the jar:
  `ln -s <path-to-project>/druid-extension/build/libs/whylabs-extension.jar`
* Add the extension to the extension list. Here I'm using the `micro-quickstart` example:
* Configuration file
  under: `conf/druid/single-server/micro-quickstart/_common/common.runtime.properties`
* Update the `druid.extensions.loadlist` with BOTH `druid-whylabs` and `druid-datasketches`

 ```
 druid.extensions.loadList=["druid-whylabs", "druid-datasketches", "druid-kinesis-indexing-service"]
 ```

## Testing

* Start local Druid with:

```
./bin/start-micro-quickstart
```

## Kinesis testing

 * Make your SSO login credential available on the default provider chain for druid's kinesis extension to use 
```
brew install npm; npm install -g aws-sso-creds-helper; 
aws sso login
ssocreds -p default
```

 * Base64 encode a sample message payload and put it on kinesis

```
https://www.base64encode.org/  

{"version":"0","id":"1b15b80f-6bcd-8f1b-b50a-471a308fd689","detail-type":"AWS API Call via CloudTrail","source":"aws.s3","account":"222222222222","time":"2021-06-29T19:54:31Z","region":"us-west-2","resources":[],"detail":{"eventVersion":"1.08","userIdentity":{"type":"AssumedRole","principalId":"AROATAQZJVYYCU6KY2J5Z:drew@whylabs.ai","arn":"arn:aws:sts::222222222222:assumed-role/AWSReservedSSO_DeveloperFullAccess_6c92e887746e1955/drew@whylabs.ai","accountId":"222222222222","accessKeyId":"ASIATAQZJVYYKQKIBONJ","sessionContext":{"sessionIssuer":{"type":"Role","principalId":"AROATAQZJVYYCU6KY2J5Z","arn":"arn:aws:iam::222222222222:role/aws-reserved/sso.amazonaws.com/us-west-2/AWSReservedSSO_DeveloperFullAccess_6c92e887746e1955","accountId":"222222222222","userName":"AWSReservedSSO_DeveloperFullAccess_6c92e887746e1955"},"attributes":{"creationDate":"2021-06-29T12:10:43Z","mfaAuthenticated":"false"}}},"eventTime":"2021-06-29T19:54:31Z","eventSource":"s3.amazonaws.com","eventName":"PutObject","awsRegion":"us-west-2","sourceIPAddress":"75.40.154.193","userAgent":"[aws-cli/2.2.14 Python/3.9.5 Darwin/20.4.0 source/x86_64 prompt/off command/s3.cp]","requestParameters":{"bucketName":"development-songbird-20201028054020481800000001","Host":"development-songbird-20201028054020481800000001.s3.us-west-2.amazonaws.com","key":"daily-log-untrusted/2021-06-22/org-9758-model-1-8YXecPveYrs0GbrSlHbo7hw6CW6gyKLM.bin"},"responseElements":{"x-amz-server-side-encryption":"aws:kms","x-amz-server-side-encryption-aws-kms-key-id":"arn:aws:kms:us-west-2:222222222222:key/9490df51-6cd4-4700-be82-6594c1e0fcbd"},"additionalEventData":{"SignatureVersion":"SigV4","CipherSuite":"ECDHE-RSA-AES128-GCM-SHA256","bytesTransferredIn":25701.0,"SSEApplied":"Default_SSE_KMS","AuthenticationMethod":"AuthHeader","x-amz-id-2":"hci19wl7eJ+r3DQqTcnGVGbwZU4+n8zOUpQSi/1AqZSGm9a/ZlFGJREQk/rRb05nqkZfQ+Hl4Pg=","bytesTransferredOut":0.0},"requestID":"2BTM82MWJ65M4YB4","eventID":"8e99f55e-8a19-479c-a7d5-fbbfd91ec77e","readOnly":false,"resources":[{"type":"AWS::S3::Object","ARN":"arn:aws:s3:::development-songbird-20201028054020481800000001/daily-log-untrusted/2021-06-22/org-9758-model-1-8YXecPveYrs0GbrSlHbo7hw6CW6gyKLM.bin"},{"accountId":"222222222222","type":"AWS::S3::Bucket","ARN":"arn:aws:s3:::development-songbird-20201028054020481800000001"}],"eventType":"AwsApiCall","managementEvent":false,"recipientAccountId":"222222222222","eventCategory":"Data"}}
 
aws kinesis put-record --stream-name p-drew-ProfileUploadNotifications-4676b25 --partition-key 1 --data eyJ2ZXJzaW9uIjoiMCIsImlkIjoiMWIxNWI4MGYtNmJjZC04ZjFiLWI1MGEtNDcxYTMwOGZkNjg5IiwiZGV0YWlsLXR5cGUiOiJBV1MgQVBJIENhbGwgdmlhIENsb3VkVHJhaWwiLCJzb3VyY2UiOiJhd3MuczMiLCJhY2NvdW50IjoiMjA3Mjg1MjM1MjQ4IiwidGltZSI6IjIwMjEtMDYtMjlUMTk6NTQ6MzFaIiwicmVnaW9uIjoidXMtd2VzdC0yIiwicmVzb3VyY2VzIjpbXSwiZGV0YWlsIjp7ImV2ZW50VmVyc2lvbiI6IjEuMDgiLCJ1c2VySWRlbnRpdHkiOnsidHlwZSI6IkFzc3VtZWRSb2xlIiwicHJpbmNpcGFsSWQiOiJBUk9BVEFRWkpWWVlDVTZLWTJKNVo6ZHJld0B3aHlsYWJzLmFpIiwiYXJuIjoiYXJuOmF3czpzdHM6OjIwNzI4NTIzNTI0ODphc3N1bWVkLXJvbGUvQVdTUmVzZXJ2ZWRTU09fRGV2ZWxvcGVyRnVsbEFjY2Vzc182YzkyZTg4Nzc0NmUxOTU1L2RyZXdAd2h5bGFicy5haSIsImFjY291bnRJZCI6IjIwNzI4NTIzNTI0OCIsImFjY2Vzc0tleUlkIjoiQVNJQVRBUVpKVllZS1FLSUJPTkoiLCJzZXNzaW9uQ29udGV4dCI6eyJzZXNzaW9uSXNzdWVyIjp7InR5cGUiOiJSb2xlIiwicHJpbmNpcGFsSWQiOiJBUk9BVEFRWkpWWVlDVTZLWTJKNVoiLCJhcm4iOiJhcm46YXdzOmlhbTo6MjA3Mjg1MjM1MjQ4OnJvbGUvYXdzLXJlc2VydmVkL3Nzby5hbWF6b25hd3MuY29tL3VzLXdlc3QtMi9BV1NSZXNlcnZlZFNTT19EZXZlbG9wZXJGdWxsQWNjZXNzXzZjOTJlODg3NzQ2ZTE5NTUiLCJhY2NvdW50SWQiOiIyMDcyODUyMzUyNDgiLCJ1c2VyTmFtZSI6IkFXU1Jlc2VydmVkU1NPX0RldmVsb3BlckZ1bGxBY2Nlc3NfNmM5MmU4ODc3NDZlMTk1NSJ9LCJhdHRyaWJ1dGVzIjp7ImNyZWF0aW9uRGF0ZSI6IjIwMjEtMDYtMjlUMTI6MTA6NDNaIiwibWZhQXV0aGVudGljYXRlZCI6ImZhbHNlIn19fSwiZXZlbnRUaW1lIjoiMjAyMS0wNi0yOVQxOTo1NDozMVoiLCJldmVudFNvdXJjZSI6InMzLmFtYXpvbmF3cy5jb20iLCJldmVudE5hbWUiOiJQdXRPYmplY3QiLCJhd3NSZWdpb24iOiJ1cy13ZXN0LTIiLCJzb3VyY2VJUEFkZHJlc3MiOiI3NS40MC4xNTQuMTkzIiwidXNlckFnZW50IjoiW2F3cy1jbGkvMi4yLjE0IFB5dGhvbi8zLjkuNSBEYXJ3aW4vMjAuNC4wIHNvdXJjZS94ODZfNjQgcHJvbXB0L29mZiBjb21tYW5kL3MzLmNwXSIsInJlcXVlc3RQYXJhbWV0ZXJzIjp7ImJ1Y2tldE5hbWUiOiJkZXZlbG9wbWVudC1zb25nYmlyZC0yMDIwMTAyODA1NDAyMDQ4MTgwMDAwMDAwMSIsIkhvc3QiOiJkZXZlbG9wbWVudC1zb25nYmlyZC0yMDIwMTAyODA1NDAyMDQ4MTgwMDAwMDAwMS5zMy51cy13ZXN0LTIuYW1hem9uYXdzLmNvbSIsImtleSI6ImRhaWx5LWxvZy11bnRydXN0ZWQvMjAyMS0wNi0yMi9vcmctOTc1OC1tb2RlbC0xLThZWGVjUHZlWXJzMEdiclNsSGJvN2h3NkNXNmd5S0xNLmJpbiJ9LCJyZXNwb25zZUVsZW1lbnRzIjp7IngtYW16LXNlcnZlci1zaWRlLWVuY3J5cHRpb24iOiJhd3M6a21zIiwieC1hbXotc2VydmVyLXNpZGUtZW5jcnlwdGlvbi1hd3Mta21zLWtleS1pZCI6ImFybjphd3M6a21zOnVzLXdlc3QtMjoyMDcyODUyMzUyNDg6a2V5Lzk0OTBkZjUxLTZjZDQtNDcwMC1iZTgyLTY1OTRjMWUwZmNiZCJ9LCJhZGRpdGlvbmFsRXZlbnREYXRhIjp7IlNpZ25hdHVyZVZlcnNpb24iOiJTaWdWNCIsIkNpcGhlclN1aXRlIjoiRUNESEUtUlNBLUFFUzEyOC1HQ00tU0hBMjU2IiwiYnl0ZXNUcmFuc2ZlcnJlZEluIjoyNTcwMS4wLCJTU0VBcHBsaWVkIjoiRGVmYXVsdF9TU0VfS01TIiwiQXV0aGVudGljYXRpb25NZXRob2QiOiJBdXRoSGVhZGVyIiwieC1hbXotaWQtMiI6ImhjaTE5d2w3ZUorcjNEUXFUY25HVkdid1pVNCtuOHpPVXBRU2kvMUFxWlNHbTlhL1psRkdKUkVRay9yUmIwNW5xa1pmUStIbDRQZz0iLCJieXRlc1RyYW5zZmVycmVkT3V0IjowLjB9LCJyZXF1ZXN0SUQiOiIyQlRNODJNV0o2NU00WUI0IiwiZXZlbnRJRCI6IjhlOTlmNTVlLThhMTktNDc5Yy1hN2Q1LWZiYmZkOTFlYzc3ZSIsInJlYWRPbmx5IjpmYWxzZSwicmVzb3VyY2VzIjpbeyJ0eXBlIjoiQVdTOjpTMzo6T2JqZWN0IiwiQVJOIjoiYXJuOmF3czpzMzo6OmRldmVsb3BtZW50LXNvbmdiaXJkLTIwMjAxMDI4MDU0MDIwNDgxODAwMDAwMDAxL2RhaWx5LWxvZy11bnRydXN0ZWQvMjAyMS0wNi0yMi9vcmctOTc1OC1tb2RlbC0xLThZWGVjUHZlWXJzMEdiclNsSGJvN2h3NkNXNmd5S0xNLmJpbiJ9LHsiYWNjb3VudElkIjoiMjA3Mjg1MjM1MjQ4IiwidHlwZSI6IkFXUzo6UzM6OkJ1Y2tldCIsIkFSTiI6ImFybjphd3M6czM6OjpkZXZlbG9wbWVudC1zb25nYmlyZC0yMDIwMTAyODA1NDAyMDQ4MTgwMDAwMDAwMSJ9XSwiZXZlbnRUeXBlIjoiQXdzQXBpQ2FsbCIsIm1hbmFnZW1lbnRFdmVudCI6ZmFsc2UsInJlY2lwaWVudEFjY291bnRJZCI6IjIwNzI4NTIzNTI0OCIsImV2ZW50Q2F0ZWdvcnkiOiJEYXRhIn19
```

 * Trigger a kinesis ingestion task locally

```
bash kinesis.sh druid-extension/examples/ingest/experiment_kinesis_ingest.json
```

 * To watch the detailed task logs you can find those locally somewhere like this
```
cat /Users/drew/whylabs/druid/var/druid/task/index_kinesis_whylogsStreaming_9af3687cedade86_neimfdef/log
```
 * Detailed logs on the imply custer 
```
ssh-add -K ~/.ssh/whylabs-dev-key.pem
ssh ubuntu@[public IP of the datanode running the task. IPs listed https://whylabs.implycloud.com/clusters/b24ec4db-2a7c-4b4f-b803-d0c2959c6816]
cat /mnt/tmp/persistent/task/index_kinesis_whylogsStreaming_3315fd5296e0c74_pciakhhh/log

```


### Kinesis Ingestion Local Dev Tips: 
 * If the kinesis task blows up about the kinesis squence number it's because you need to pump some data onto the topic. It's got a fetchSequenceNumberTimeout setting in the task config for allowed topic idleness.
 * If the task fails due to a credentials issue don't forget to run ssocreds -p default after aws sso login. You must do this every time as sso logins only work for CLI tools at the moment.
 * If druid hangs on "creating tasks" with no error or progress for 1+ minutes just publish a fresh record on the topic. Kinesis can get hung up seeking offsets when a topic is idle and seeking offsets is part of the creation of the kinesis ingestion task.  

### Kinesis Ingestion Deployment
 * (currently manual process) Grant Kinesis consumption and publishing access to druid's IAM role 
 * (currently manual process) POST druid-extension/examples/ingest/experiment_kinesis_ingest.json https://imply-b24-elbexter-1xpmtuf5l4kkg-1663588953.us-west-2.elb.amazonaws.com:9088/druid/indexer/v1/supervisor
 * Note imply platform loads the kinesis extension by default, no need to modify druid.extensions.loadList on the live cluster. Also imply 2021.04 had a bugfix on that extension (kinesis lag related) we might care about. 

## Conclusion
* Go to http://localhost:8888
* Have a whylogs profile ready
* Load data with a test spec
* If you update the JAR, you'll need to restart the Druid cluster