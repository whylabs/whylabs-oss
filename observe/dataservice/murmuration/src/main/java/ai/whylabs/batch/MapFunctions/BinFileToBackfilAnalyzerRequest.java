package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.structures.BackfillAnalyzerRequest;
import ai.whylabs.core.structures.BinaryFileRow;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.api.java.function.FlatMapFunction;

@Slf4j
public class BinFileToBackfilAnalyzerRequest
    implements FlatMapFunction<BinaryFileRow, BackfillAnalyzerRequest> {
  private static final transient ThreadLocal<ObjectMapper> MAPPER =
      ThreadLocal.withInitial(ObjectMapper::new);

  @Override
  public Iterator<BackfillAnalyzerRequest> call(BinaryFileRow binaryFileRow) throws Exception {
    List<BackfillAnalyzerRequest> requests = new ArrayList();

    try {
      val b = MAPPER.get().readValue(binaryFileRow.getContent(), BackfillAnalyzerRequest.class);
      b.setRequestFilename(binaryFileRow.getPath());
      requests.add(b);
    } catch (Exception e) {
      log.error("Unable to parse backfill request {}", binaryFileRow.getPath());
    }

    return requests.iterator();
  }
}
