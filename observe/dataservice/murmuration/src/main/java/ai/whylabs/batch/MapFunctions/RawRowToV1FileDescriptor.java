package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.structures.DatalakeRowV2;
import ai.whylabs.core.structures.V1FileDescriptor;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.Iterator;
import lombok.val;
import org.apache.spark.api.java.function.FlatMapFunction;
import org.apache.spark.sql.Row;

public class RawRowToV1FileDescriptor implements FlatMapFunction<Row, V1FileDescriptor> {
  @Override
  public Iterator<V1FileDescriptor> call(Row row) throws Exception {
    val b =
        V1FileDescriptor.builder()
            .path(row.getAs(DatalakeRowV2.Fields.originalFilename))
            .modificationTime(
                Timestamp.from(Instant.ofEpochMilli(row.getAs(DatalakeRowV2.Fields.lastUploadTs))))
            .enableGranularDataStorage(row.getAs(DatalakeRowV2.Fields.enableGranularDataStorage));
    return Arrays.asList(b.build()).iterator();
  }
}
