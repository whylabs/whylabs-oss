package ai.whylabs.ingestion;

import com.whylogs.core.message.ColumnMessage;
import java.util.Iterator;
import org.apache.commons.lang3.tuple.Pair;

// iterator for V1 metrics.  Each Pair is a combination of feature name and ColumnMessage.
// ColumnMessage contains multiple metrics, like min, max, hll, kll, etc.  All metrics in a single
// ColumnMessage will apply to the feature named in the pair.
//
// All pairs in the iterator will apply to a single profile - no mixing of dates or segments tags
// within an IMetricsIterator!
public interface IMetricsIterator extends Iterator<Pair<String, ColumnMessage>> {
  public final String WHYLOGS_VERSION0 = "WHY0";
  public final String WHYLOGS_VERSION1 = "WHY1";

  V1Metadata getMetadata();
}
