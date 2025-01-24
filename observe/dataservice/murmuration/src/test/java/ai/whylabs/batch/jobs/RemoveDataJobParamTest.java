package ai.whylabs.batch.jobs;

import ai.whylabs.batch.BaseTest;
import com.google.common.collect.ImmutableList;
import lombok.val;
import org.testng.annotations.Test;

public class RemoveDataJobParamTest extends BaseTest {

  @Test(expectedExceptions = {com.beust.jcommander.ParameterException.class})
  public void testUnknownParameters() {

    val removeOtherOrgArgs =
        ImmutableList.of(
                "-sparkMaster",
                "local[*]",
                "-location",
                "blah",
                "-targetOrgId",
                "org-1",
                "-interval",
                "2016-10-08T00:00:00Z/2022-10-08T00:00:00Z",
                "-dyyrun")
            .toArray(new String[0]);

    RemoveDataJob removeDataJob = new RemoveDataJob();
    removeDataJob.setSpark(spark);
    removeDataJob.run(removeOtherOrgArgs);
    // only assertion for this test is that is throws ParameterException
  }
}
