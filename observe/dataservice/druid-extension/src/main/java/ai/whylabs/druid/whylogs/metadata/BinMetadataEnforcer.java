package ai.whylabs.druid.whylogs.metadata;

import static ai.whylabs.druid.whylogs.column.WhyLogsRow.DATASET_ID;
import static ai.whylabs.druid.whylogs.column.WhyLogsRow.ORG_ID;
import static ai.whylabs.druid.whylogs.column.WhyLogsRow.REFERENCE_PROFILE_ID;

import ai.whylabs.druid.whylogs.column.DatasetProfileMessageWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Objects;
import javax.annotation.Nullable;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.lang3.tuple.Pair;

/**
 * General flow for logAsync is the customer hits our API for a presigned url to upload a bin file.
 * Our logAsync API generates a json metadata file with the orgId and datasetId based on Auth0 and
 * the dataset they're specifying they're uploading in the API call. The bin file gets uploaded
 * afterwards directly to S3. We wanna ignore the properties set inside the protobuf for those two
 * fields because the customer could set them to anything they want.
 *
 * <p>s3://development-songbird-20201028054020481800000001/daily-log-untrusted/2021-06-18/
 * org-9758-model-1-6lNVpjQH2DQ5juwU9fqHT0gqvOOgAY5d.bin
 * org-9758-model-1-6lNVpjQH2DQ5juwU9fqHT0gqvOOgAY5d.json
 *
 * <p>What this class is going to do is load up that bin file, swap out those properties, and
 * produce a new bytearray.
 */
public class BinMetadataEnforcer {
  public static final BinMetadataEnforcer INSTANCE = new BinMetadataEnforcer();

  public static final ObjectMapper MAPPER = new ObjectMapper();
  private static final String VALUE = "value";

  @SneakyThrows
  public Pair<BinMetadata, DatasetProfileMessage> enforce(
      DatasetProfileMessage profileMessage, String metadataString) {
    if (metadataString == null) {
      return Pair.of(null, profileMessage);
    }

    BinMetadata metadata = MAPPER.readValue(metadataString, BinMetadata.class);
    long datasetTimestamp;
    if (metadata.getDatasetTimestamp() != null && metadata.getDatasetTimestamp() > 0) {
      datasetTimestamp = metadata.getDatasetTimestamp();
    } else {
      datasetTimestamp = profileMessage.getProperties().getDataTimestamp();
    }

    return Pair.of(
        metadata,
        enforce(
            profileMessage,
            metadata.getOrgId(),
            metadata.getDatasetId(),
            datasetTimestamp,
            metadata.getId(),
            collapseTagMap(metadata)));
  }

  /**
   * spotless:off
   * Example metadata
   * {
   *   "id": null,
   *   "orgId": "org-5306",
   *   "datasetId": "model-8",
   *   "datasetTimestamp": 1638345600000,
   *   "uploadKeyId": "GxvlnwtrmG",
   *   "tags": { "tags": [{ "key": "product_name", "value": "register terminal" }] }
   * }
   *
   * This method flattens out that tag structure. All keys in the resulting map will be prefixed with "whylogs.tag.",
   * e.g. {"whylogs.tag.product_name":"register terminal"}
   * spotless:on
   */
  public static Map<String, String> collapseTagMap(@Nullable BinMetadata metadata) {
    Map<String, String> collapsedTagMap = new HashMap<>();
    if (metadata != null && metadata.getTags() != null) {
      for (List<Map<String, String>> segment : metadata.getTags().values()) {

        for (Map<String, String> tag : segment) {
          String key = null;
          String value = null;

          for (Entry<String, String> pair : tag.entrySet()) {
            if (pair.getKey().equals(VALUE)) {
              value = pair.getValue();
            } else {
              key = pair.getValue();
              if (key != null && !key.startsWith(DatasetProfileMessageWrapper.TAG_PREFIX)) {
                key = DatasetProfileMessageWrapper.TAG_PREFIX + key;
              }
            }
          }
          if (key != null && value != null) {
            collapsedTagMap.put(key, value);
          }
        }
      }
    }
    return collapsedTagMap;
  }

  public DatasetProfileMessage enforce(
      @NonNull DatasetProfileMessage profileMessage,
      @NonNull String orgId,
      @Nullable String datasetId,
      @Nullable Long datasetTimestamp,
      @Nullable String referenceProfileId,
      @Nullable Map<String, String> tags) {

    val profileOrgId = profileMessage.getProperties().getTagsMap().get(ORG_ID);
    val profileDatasetId = profileMessage.getProperties().getTagsMap().get(DATASET_ID);
    long profileDataTimestamp = profileMessage.getProperties().getDataTimestamp();

    final boolean matchingOrgId = Objects.equals(orgId, profileOrgId);
    final boolean matchingDatasetId =
        !StringUtils.isEmpty(datasetId) && Objects.equals(datasetId, profileDatasetId);
    final boolean matchingTimestamp = Objects.equals(datasetTimestamp, profileDataTimestamp);

    if (matchingOrgId
        && matchingDatasetId
        && matchingTimestamp
        && StringUtils.isEmpty(referenceProfileId)) {
      return profileMessage;
    }

    val dsProperties = profileMessage.getProperties().toBuilder();

    if (tags != null) {
      dsProperties.putAllTags(tags);
    }

    dsProperties.putTags(ORG_ID, orgId);
    if (!StringUtils.isEmpty(datasetId)) {
      dsProperties.putTags(DATASET_ID, datasetId);
    }

    if (!StringUtils.isEmpty(referenceProfileId)) {
      dsProperties.putTags(REFERENCE_PROFILE_ID, referenceProfileId);
    }

    if (datasetTimestamp != null) {
      dsProperties.setDataTimestamp(datasetTimestamp);
    }

    return profileMessage //
        .toBuilder() //
        .setProperties(dsProperties)
        .build();
  }

  @SneakyThrows
  public Pair<BinMetadata, DatasetProfileMessage> enforce(
      DatasetProfileMessage profileMessage, byte[] metadataByteString) {
    if (metadataByteString == null) {
      return Pair.of(null, profileMessage);
    }
    String jsonMetadata = new String(metadataByteString);
    return enforce(profileMessage, jsonMetadata);
  }
}
