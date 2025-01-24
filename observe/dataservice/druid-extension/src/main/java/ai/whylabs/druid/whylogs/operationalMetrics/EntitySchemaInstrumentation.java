package ai.whylabs.druid.whylogs.operationalMetrics;

import ai.whylabs.druid.whylogs.column.WhyLogsMetrics;
import java.util.stream.Stream;
import org.apache.commons.lang3.tuple.Pair;

public interface EntitySchemaInstrumentation {

  void instrument(WhyLogsMetrics next);

  Stream<Pair<String, Metadata>> metadataStream();
}
