package ai.whylabs.dataservice;

import ai.whylabs.dataservice.enums.Instance;
import io.micronaut.context.annotation.ConfigurationProperties;
import javax.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@ConfigurationProperties("whylabs.dataservice")
@Getter
@Setter
public class DataSvcConfig {
  @NotBlank private String songbirdBucket;
  @NotBlank private String profileNotificationTopic;
  @NotBlank private String kinesisApplicationName;
  @NotBlank private String postgresBulkIngestionTriggerTopic;
  @NotBlank private String ingestionNotificationStream;
  @NotBlank private String cloudtrailBucket;
  @NotBlank private String sirenNotificationTopic;

  private boolean enableKinesis = false;
  private boolean enableBackfill = false;
  private boolean deployed = false;

  // maintain ingestion state in audit table, necessary for non-backfill ingestion.
  private boolean enableLiveIngestion = false;
  private Instance instance = Instance.main;
}
