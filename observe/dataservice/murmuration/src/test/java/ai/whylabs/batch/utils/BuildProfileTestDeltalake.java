package ai.whylabs.batch.utils;

import ai.whylabs.batch.BaseTest;
import ai.whylabs.batch.jobs.WhylogDeltalakeWriterJob;
import com.google.common.collect.ImmutableList;
import lombok.val;
import org.testng.annotations.Test;

public class BuildProfileTestDeltalake extends BaseTest {

  // Utility to create profile deltalakes for unit tests
  @Test(enabled = false)
  void BuildClassificationProfileDeltalake() {
    // Profiles are ingested from "/Users/chris/work/profiles/2021-07-01/".
    //
    // NOTE: profiles have internal timestamp from 7-19-2021 to 10-14-2021.
    // Keep that in mind when applying monitor configs, etc.

    // Profiles were originally copied from S3,
    // aws s3 cp --recursive
    // s3://development-songbird-20201028054020481800000001/daily-log-untrusted/2021-10-15/ \
    //     . --exclude '*' --include 'org-0-model-303*.bin'

    val job = new WhylogDeltalakeWriterJob();
    job.setSpark(spark);

    // spotless:off
    val args =
        ImmutableList.of(
                // spotless:off
                "-sparkMaster", "local[*]",
                "-source", "/Users/chris/work/profiles/",
                "-destination", "src/test/resources/classification/profiletable",
                "-monitorConfigV3", "src/test/resources/classification/monitorconfig",
                "-currentTime", "2021-07-02T15:30:00Z"
                // spotless:on

                )
            .toArray(new String[0]);
    // spotless:on

    job.run(args);
  }

  // Utility to create profile deltalakes for unit tests
  @Test(enabled = false)
  void BuildReggressionProfileDeltalake() {
    // Profiles are ingested from "/Users/chris/work/profiles/regression/2022-03-16/".
    //
    // NOTE: profiles have internal timestamp from 3-10-2022 to 3-15-2022.
    // Keep that in mind when applying monitor configs, etc.

    // Profiles were originally copied from S3,
    // aws s3 cp
    // s3://development-songbird-20201028054020481800000001/daily-log-untrusted/2022-03-15/ \
    //   . --recursive --exclude '*' --include 'org-0-model-2114*bin'

    val job = new WhylogDeltalakeWriterJob();
    job.setSpark(spark);

    // spotless:off
    val args =
        ImmutableList.of(
                // spotless:off
                "-sparkMaster", "local[*]",
                "-source", "/Users/chris/work/profiles/regression/",
                "-destination", "src/test/resources/regression/profiletable",
                "-currentTime", "2022-03-16T15:30:00Z"
                // spotless:on

                )
            .toArray(new String[0]);
    // spotless:on

    job.run(args);
  }
}
