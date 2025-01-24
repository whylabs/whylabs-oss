package ai.whylabs.batch.jobs;

import static org.testng.Assert.*;

public class ExternalS3ToDeltalakeJobTest {

  /* TODO: Chris/Andy did you want this enabled? If so, this test needs some mockito action
  @SneakyThrows
  @Test
  public void testJob() {
    val destination = Files.createTempDirectory("profile_deltalake");

    val sparkJobArgs =
        ImmutableList.of(
                "-sparkMaster", "local[*]",
                "-destination", destination.toString(),
                "-sourcePath", "s3://whylogs-profiles-prod/prod/",
                "-sourceRoleArn", "arn:aws:iam::340748453374:role/ext-whylabs-access",
                "-externalId", "bb64565da77c1be5f86ac7db5de7e3e0",
                "-orgId", "org-4TKBKn",
                "-currentTime", "2022-02-09T16:01:00Z")
            .toArray(new String[0]);

    val job = new ExternalS3ToDeltalakeJob();
    job.apply(sparkJobArgs);
    job.run(sparkJobArgs);
  }
  */

}
