package ai.whylabs.dataservice.operationalMetrics;

import java.util.Map;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldNameConstants;

@Data
@Builder
@FieldNameConstants
/**
 * A profile gets uploaded to S3, an S3UploadNotification hits kinesis, and then it's a black box to
 * the user after that. It'll probably, hopefully, eventually, maybe show up in druid when querying.
 * Lets take the guesswork out of the game and publish this here notification over kinesis so that
 * any service that wants to be aware that new data is now queryable in druid or that it's outside
 * the mutability window and wont show up until a backfill job runs. These notifications can be
 * watched by dashbird to make the UI more responsive to data ingestion without having to poll
 * druid.
 */
public class OperationalMetric {
  private String orgId;
  private String datasetId;
  private MetricType metricType;
  private long ts;
  private Long datasetTs;
  private String file;
  private Failure failure;
  private Map<String, ColumnMetadata> columnMetadata;

  /**
   * Generic metric, pair with metricType to add meaning. For example MetricType.SIREN_DIGEST_SEND +
   * 42 = we sent 42 digests
   */
  private Long metric;

  // indicate producer of this message, for logging and debugging
  private String producer;
}
