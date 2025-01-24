package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.MonitorConfigV3.Fields;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.structures.BinaryProfileRow;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Collections;
import java.util.Iterator;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.api.java.function.FlatMapFunction;

@Slf4j
public class ConfigV3JsonFileToMonitorConfigV3Row
    implements FlatMapFunction<BinaryProfileRow, MonitorConfigV3Row> {
  private static final transient ThreadLocal<ObjectMapper> MAPPER =
      ThreadLocal.withInitial(ObjectMapper::new);

  @Override
  public Iterator<MonitorConfigV3Row> call(BinaryProfileRow binaryProfileRow) throws Exception {

    String json = new String(binaryProfileRow.getContent());
    JsonNode obj = MAPPER.get().readTree(json);
    if (!obj.has(MonitorConfigV3.Fields.orgId) || !obj.has(Fields.datasetId)) {
      log.info(
          "File {} must have an org id and dataset id populated to procede",
          binaryProfileRow.getPath());
      return Collections.emptyIterator();
    }

    String orgId = obj.get(MonitorConfigV3.Fields.orgId).asText();
    String datasetId = obj.get(MonitorConfigV3.Fields.datasetId).asText();
    String id = UUID.randomUUID().toString();
    if (obj.has(MonitorConfigV3.Fields.id)) {
      id = obj.get(MonitorConfigV3.Fields.id).asText();
    }

    Long updatedTs = binaryProfileRow.getModificationTime().getTime();
    Long bin =
        ZonedDateTime.ofInstant(Instant.ofEpochMilli(updatedTs), ZoneOffset.UTC)
            .truncatedTo(ChronoUnit.HOURS)
            .toInstant()
            .toEpochMilli();

    val row =
        MonitorConfigV3Row.builder()
            .orgId(orgId)
            // Json min, but preserve orig content
            .jsonConf(obj.toString())
            .datasetId(datasetId)
            .id(id)
            .updatedTs(updatedTs)
            .bin(bin)
            .build();
    return Arrays.asList(row).iterator();
  }
}
