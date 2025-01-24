package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.enums.IngestionRollupGranularity;
import ai.whylabs.core.structures.Org;
import ai.whylabs.core.structures.V1FileDescriptor;
import org.apache.spark.api.java.function.MapFunction;
import scala.Tuple2;

public class PopulateDescriptorFromOrgConfig
    implements MapFunction<Tuple2<V1FileDescriptor, Org>, V1FileDescriptor> {

  @Override
  public V1FileDescriptor call(Tuple2<V1FileDescriptor, Org> t) throws Exception {

    Org org = t._2();
    V1FileDescriptor d = t._1();
    d.setIngestionGranularity(IngestionRollupGranularity.hourly);
    d.setEnableGranularDataStorage(false);

    if (org != null && org.getIngestionGranularity() != null) {
      d.setIngestionGranularity(org.getIngestionGranularity());
    }
    if (org != null && org.getEnableGranularDataStorage() != null) {
      d.setEnableGranularDataStorage(org.getEnableGranularDataStorage());
    }
    return d;
  }
}
