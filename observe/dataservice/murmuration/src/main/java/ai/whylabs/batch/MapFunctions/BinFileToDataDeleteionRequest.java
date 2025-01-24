package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.structures.BinaryFileRow;
import ai.whylabs.core.structures.DataDeletionRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.api.java.function.FlatMapFunction;

@Slf4j
public class BinFileToDataDeleteionRequest
    implements FlatMapFunction<BinaryFileRow, DataDeletionRequest> {
  private static final transient ThreadLocal<ObjectMapper> MAPPER =
      ThreadLocal.withInitial(ObjectMapper::new);

  @Override
  public Iterator<DataDeletionRequest> call(BinaryFileRow binaryFileRow) throws Exception {
    List<DataDeletionRequest> requests = new ArrayList();

    try {
      val d = MAPPER.get().readValue(binaryFileRow.getContent(), DataDeletionRequest.class);
      d.setRequestFilename(binaryFileRow.getPath());
      requests.add(d);
    } catch (Exception e) {
      log.error("Unable to parse data deletion request {}", binaryFileRow.getPath());
    }

    return requests.iterator();
  }
}
