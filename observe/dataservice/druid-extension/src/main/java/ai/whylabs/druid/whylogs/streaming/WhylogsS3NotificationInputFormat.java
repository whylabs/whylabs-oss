package ai.whylabs.druid.whylogs.streaming;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.io.File;
import javax.annotation.Nullable;
import org.apache.druid.data.input.InputEntity;
import org.apache.druid.data.input.InputEntityReader;
import org.apache.druid.data.input.InputRowSchema;
import org.apache.druid.data.input.impl.NestedInputFormat;
import org.apache.druid.java.util.common.parsers.JSONPathSpec;

/**
 * Watch for a stream of s3 upload notifications via this standard
 * https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-content-structure.html and use
 * that for streaming ingestion
 */
public class WhylogsS3NotificationInputFormat extends NestedInputFormat {

  private String druidIngestionStatusNotificationStream;
  private boolean rateLimitPerOrg = false;
  private String metricsNamespace = "_notused"; // prefix "_" indicates no cloud watch

  // logReference API
  private boolean enableRefProfile = false;

  // log and logAsync APIs
  private boolean enableDailyLogs = true;

  @JsonCreator
  protected WhylogsS3NotificationInputFormat(
      @JsonProperty("flattenSpec") @Nullable JSONPathSpec flattenSpec,
      @JsonProperty("druidIngestionStatusNotificationStream") @Nullable
          String druidIngestionStatusNotificationStream,
      @JsonProperty("rateLimitPerOrg") @Nullable Boolean rateLimit,
      @JsonProperty("metricsNamespace") @Nullable String metricsNamespace,
      @JsonProperty("enableRefProfile") @Nullable Boolean enableRefProfile,
      @JsonProperty("enableDailyLogs") @Nullable Boolean enableDailyLogs) {
    super(flattenSpec);
    this.druidIngestionStatusNotificationStream = druidIngestionStatusNotificationStream;
    if (rateLimit != null) {
      this.rateLimitPerOrg = rateLimit;
    }
    if (enableRefProfile != null) {
      this.enableRefProfile = enableRefProfile;
    }
    if (enableDailyLogs != null) {
      this.enableDailyLogs = enableDailyLogs;
    }
    if (metricsNamespace != null && !metricsNamespace.isEmpty()) {
      // check for Empty b/c JSON ingest spec may define parameters as "".
      this.metricsNamespace = metricsNamespace;
    }
  }

  @JsonProperty
  public String getDruidIngestionStatusNotificationStream() {
    return druidIngestionStatusNotificationStream;
  }

  @JsonProperty
  public void setDruidIngestionStatusNotificationStream(
      String druidIngestionStatusNotificationStream) {
    this.druidIngestionStatusNotificationStream = druidIngestionStatusNotificationStream;
  }

  @JsonProperty
  public boolean isRateLimitPerOrg() {
    return rateLimitPerOrg;
  }

  @JsonProperty
  public void setRateLimitPerOrg(boolean rateLimitPerOrg) {
    this.rateLimitPerOrg = rateLimitPerOrg;
  }

  @JsonProperty
  public boolean isEnableRefProfile() {
    return enableRefProfile;
  }

  @JsonProperty
  public void setEnableRefProfile(boolean enableRefProfile) {
    this.enableRefProfile = enableRefProfile;
  }

  @JsonProperty
  public boolean isEnableDailyLogs() {
    return enableDailyLogs;
  }

  @JsonProperty
  public void setEnableDailyLogs(boolean enableDailyLogs) {
    this.enableDailyLogs = enableDailyLogs;
  }

  @Override
  public boolean isSplittable() {
    return false;
  }

  @JsonProperty
  public String getMetricsNamespace() {
    return metricsNamespace;
  }

  /**
   * createReader returns an object which reads and ingests a single file.
   *
   * <p>The filenames to be read are specified in the `spec.ioConfig.inputSource` section of the
   * ingestion spec. The inputSource.filter may contains wildcards, e.g. "filter": "*.bin", in which
   * case createReader is called on each matching filename. For each call `source` will identify a
   * single file to be ingested.
   *
   * <p>Note createReader may be called twice for each input file if the ingestion spec does not
   * specify both interval and partionSpec.
   *
   * @param inputRowSchema
   * @param source
   * @param temporaryDirectory
   * @return
   */
  @Override
  public InputEntityReader createReader(
      InputRowSchema inputRowSchema, InputEntity source, File temporaryDirectory) {
    return null;
  }
}
