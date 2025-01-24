package ai.whylabs.batch.MapFunctions;

import ai.whylabs.batch.jobs.V0ProfileSplitterJob;
import ai.whylabs.core.enums.ProfileColumnType;
import ai.whylabs.core.structures.DatalakeRow;
import ai.whylabs.druid.whylogs.column.WhyLogsRow;
import ai.whylabs.druid.whylogs.v1.WhyLogsV1toV0Iterator;
import com.cronutils.utils.Preconditions;
import com.whylogs.v0.core.message.ColumnMessageV0;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import java.io.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.api.java.function.FlatMapFunction;

@Slf4j
public class V0ProfileSplitter implements FlatMapFunction<DatalakeRow, DatalakeRow>, Serializable {
  @Override
  public Iterator<DatalakeRow> call(DatalakeRow datalakeRow) throws Exception {
    val template = datalakeRow.toBuilder();
    datalakeRow.setType(ProfileColumnType.MERGED);
    template.type(ProfileColumnType.MERGED);

    List<DatalakeRow> output = new ArrayList<>();

    try {
      DatasetProfileMessage profileMessage;

      try {
        val v1Reader =
            new WhyLogsV1toV0Iterator(
                new BufferedInputStream(new ByteArrayInputStream(datalakeRow.getContent())));
        profileMessage = v1Reader.toV0DatasetProfileMessage();
      } catch (IOException e) {
        profileMessage =
            DatasetProfileMessage.parseDelimitedFrom(
                new ByteArrayInputStream(datalakeRow.getContent()));
      }

      Map<String, String> tagMap = new HashMap<>();
      tagMap.putAll(profileMessage.getProperties().getTagsMap());
      /**
       * Probably un-necessary, but I'm trying to disturb legacy V0 code as little as possible by
       * removing the new tag. It becomes a top level column in the deltalake.
       */
      if (tagMap.containsKey(WhyLogsRow.TRACE_ID)) {
        template.traceId(tagMap.get(WhyLogsRow.TRACE_ID));
        tagMap.remove(WhyLogsRow.TRACE_ID);
      }

      val builder =
          profileMessage.toBuilder()
              .setProperties(profileMessage.getProperties().toBuilder().putAllTags(tagMap).build());
      if (profileMessage.hasModeProfile()) {
        // Spin out 1 profile with the dataset level stuff
        builder.clearColumns();
        val content = toBytes(builder.build());
        output.add(
            template.content(content).numColumns(0).length(new Long(content.length)).build());
      }

      val colMap = profileMessage.getColumnsMap();
      int size = colMap.size();
      if (size == 0) {
        return output.iterator();
      }

      AtomicInteger ai = new AtomicInteger();
      Collection<List<Map.Entry<String, ColumnMessageV0>>> chunks =
          colMap.entrySet().stream()
              .collect(
                  Collectors.groupingBy(
                      it -> ai.getAndIncrement() / V0ProfileSplitterJob.SPLIT_THRESHOLD))
              .values();

      for (val chunk : chunks) {
        builder.clearColumns().clearModeProfile();
        Preconditions.checkArgument(
            chunk.size() <= V0ProfileSplitterJob.SPLIT_THRESHOLD.intValue(),
            "Chunk larger than split threshold, something went wrong in the groupingBy ^");
        for (val e : chunk) {
          builder.putColumns(e.getKey(), e.getValue());
        }
        val smallMsg = builder.build();
        val content = toBytes(smallMsg);
        val numCols = smallMsg.getColumnsCount();
        output.add(
            template.content(content).numColumns(numCols).length(new Long(content.length)).build());
      }
    } catch (Exception e) {
      log.error(
          "Error parsing, leaving this one like it is for {} {}",
          datalakeRow.getOrgId(),
          datalakeRow.getDatasetId());
      return Arrays.asList(datalakeRow).iterator();
    }

    return output.iterator();
  }

  @SneakyThrows
  private byte[] toBytes(DatasetProfileMessage msg) {
    ByteArrayOutputStream bos = new ByteArrayOutputStream();
    msg.writeDelimitedTo(bos);
    bos.close();
    return bos.toByteArray();
  }
}
