package ai.whylabs.batch.utils;

import ai.whylabs.core.aws.WhyLabsCredentialsProviderChain;
import com.amazonaws.services.elasticmapreduce.AmazonElasticMapReduce;
import com.amazonaws.services.elasticmapreduce.AmazonElasticMapReduceClientBuilder;
import com.amazonaws.services.elasticmapreduce.model.ClusterState;
import com.amazonaws.services.elasticmapreduce.model.ListClustersRequest;
import com.amazonaws.services.elasticmapreduce.model.ListStepsRequest;
import com.amazonaws.services.elasticmapreduce.model.StepState;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import software.amazon.awssdk.regions.Region;

@Slf4j
public class EmrConcurrencyCheck {

  /**
   * This is a quick hack. Ideally AWS step functions or whatever we replace it with would be able
   * to control pipeline run concurrency at the orchestration level. But that's high effort so the
   * hack here is to check for other clusters if any other event jobs are running, so we have an
   * early escape hatch. Lets rip this out once we have an orchestration solution in place.
   */
  public static boolean isEventJobRunningOnMultipleClusters() {
    try {
      AmazonElasticMapReduce emr =
          AmazonElasticMapReduceClientBuilder.standard()
              .withRegion(Region.US_WEST_2.toString())
              .withCredentials(WhyLabsCredentialsProviderChain.getInstance())
              .build();
      int concurrent = 0;
      for (val c :
          emr.listClusters(new ListClustersRequest().withClusterStates(ClusterState.RUNNING))
              .getClusters()) {
        log.info("Cluster name {}", c);
        if (!c.getName().contains("DailyCluster")) {
          continue;
        }

        for (val step :
            emr.listSteps(
                    new ListStepsRequest()
                        .withClusterId(c.getId())
                        .withStepStates(StepState.RUNNING, StepState.PENDING))
                .getSteps()) {
          log.info("Step name {}", step.getName());
          if (step.getName().equals("Monitor Step V3")) {
            concurrent++;
          }
        }
      }
      if (concurrent > 1) {
        return true;
      }
    } catch (Exception e) {
      log.error("Unable to check for other EMR clusters", e);
    }
    return false;
  }
}
