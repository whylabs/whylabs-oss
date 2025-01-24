package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.structures.DatalakeRowV1;
import ai.whylabs.core.utils.SegmentUtils;
import java.util.*;
import lombok.val;
import org.apache.commons.lang3.StringUtils;
import org.apache.spark.api.java.function.FlatMapFunction;

/**
 * If a row has 3 tag pairs fan it out into 3 different rows, one for each tag pair so it can be
 * evaluated independently
 */
public class DatalakeRowV1TagFanout implements FlatMapFunction<DatalakeRowV1, DatalakeRowV1> {
  @Override
  public Iterator<DatalakeRowV1> call(DatalakeRowV1 datalakeRowV1) throws Exception {
    if (StringUtils.isEmpty(datalakeRowV1.getSegmentText())) {
      return Collections.emptyIterator();
    }
    val tags = SegmentUtils.parseSegmentV3(datalakeRowV1.getSegmentText());

    val builder = datalakeRowV1.toBuilder();
    List<DatalakeRowV1> rows = new ArrayList();
    for (val tag : tags) {
      val singleTag = SegmentUtils.toStringV3(Arrays.asList(tag));
      rows.add(builder.segmentText(singleTag).build());
    }

    return rows.iterator();
  }
}
