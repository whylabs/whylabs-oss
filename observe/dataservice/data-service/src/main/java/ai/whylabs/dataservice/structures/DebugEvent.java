package ai.whylabs.dataservice.structures;

import ai.whylabs.core.configV3.structure.Tag;
import ai.whylabs.core.utils.PostgresTimestampConverter;
import ai.whylabs.dataservice.requests.SegmentTag;
import ai.whylabs.dataservice.util.KeepAsJsonDeserializer;
import ai.whylabs.dataservice.util.SegmentUtils;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.swagger.v3.oas.annotations.media.Schema;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.Nullable;
import javax.persistence.Convert;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import lombok.Builder;
import lombok.Data;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Data
@Builder
public class DebugEvent {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Schema(hidden = true)
  private Integer id;

  private String datasetId;
  private String orgId;

  @JsonPropertyDescription("Optional traceId for tying back to a specific unmerged profile")
  @Schema(required = false)
  private String traceId;

  @JsonPropertyDescription("Optional, list of segment tags to associate with the debug event")
  @Schema(required = false)
  private List<SegmentTag> segmentTags;

  @JsonPropertyDescription("Optional, customer provided set of tags")
  @Schema(required = false)
  private List<String> tags;

  // Json (cust provided). Cannot use @JsonRawValue here as Micronaut prohibits it
  @JsonDeserialize(using = KeepAsJsonDeserializer.class)
  @Schema(required = true)
  private String content;

  @Convert(converter = PostgresTimestampConverter.class)
  private Long creationTimestamp;

  @Schema(accessMode = Schema.AccessMode.READ_ONLY)
  @Convert(converter = PostgresTimestampConverter.class)
  private Long datasetTimestamp;

  @Nullable
  public static DebugEvent fromRow(Object row) {
    val o = (Object[]) row;
    try {
      return DebugEvent.builder()
          .content((String) o[0])
          .segmentTags(fromSegmentJson((String) o[1]))
          .creationTimestamp(((Timestamp) o[2]).toInstant().toEpochMilli())
          .datasetTimestamp(((Timestamp) o[3]).toInstant().toEpochMilli())
          .traceId((String) o[4])
          .tags(parseTags(o[5]))
          .build();
    } catch (Exception e) {
      log.error("Error parsing debug event", e);
      return null;
    }
  }

  @SneakyThrows
  private static List<String> parseTags(Object tags) {
    if (tags == null) {
      return null;
    }

    //noinspection unchecked
    return MAPPER.readValue((String) tags, List.class);
  }

  @SneakyThrows
  static List<SegmentTag> fromSegmentJson(String json) {
    if (json == null) {
      return null;
    }
    val tags = MAPPER.readValue(json, List.class);
    List<Tag> tagset = SegmentUtils.parseTagsV3(tags);
    List<SegmentTag> results = new ArrayList<>();
    for (val t : tagset) {
      results.add(SegmentTag.builder().key(t.getKey()).value(t.getValue()).build());
    }
    return results;
  }
}
