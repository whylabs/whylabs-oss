package ai.whylabs.batch.MapFunctions;

import static java.util.Collections.singletonList;

import ai.whylabs.core.enums.IngestionRollupGranularity;
import ai.whylabs.core.enums.ProfileColumnType;
import ai.whylabs.core.structures.DatalakeRow;
import ai.whylabs.core.structures.DatalakeRowV1;
import ai.whylabs.core.structures.Org;
import ai.whylabs.core.utils.SegmentUtils;
import ai.whylabs.ingestion.IMetricsIterator;
import ai.whylabs.ingestion.V0toV1StreamIterator;
import ai.whylabs.ingestion.V1ChunkIterator;
import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.api.java.function.FlatMapFunction;
import scala.Tuple2;

/**
 * Translate from the old profiles datalake format to the new V1 style which breaks up profiles 1
 * metric per row.
 */
@Slf4j
public class ProfilesDatalakeV0ToV1Row
    implements FlatMapFunction<Tuple2<DatalakeRow, Org>, DatalakeRowV1> {

  @Override
  public Iterator<DatalakeRowV1> call(Tuple2<DatalakeRow, Org> datalakeRowOrgTuple2)
      throws Exception {
    val row = datalakeRowOrgTuple2._1;
    val org = datalakeRowOrgTuple2._2;

    val tags = SegmentUtils.parseTagsV3(row.getTags());
    HashMap<String, String> tagMap = new HashMap();
    String segmentText = null;
    if (tags != null) {
      for (val t : tags) {
        tagMap.put(t.getKey(), t.getValue());
      }
      segmentText = SegmentUtils.toStringV3(tags);
    }

    if (row.getType().equals(ProfileColumnType.RAW)) {
      val b =
          DatalakeRowV1.builder()
              .datalakeWriteTs(System.currentTimeMillis())
              .type(ProfileColumnType.RAW)
              .orgId(row.getOrgId())
              .datasetId(row.getDatasetId())
              .originalFilename(row.getOriginalFilename())
              .referenceProfileId(row.getProfileId())
              .segmentText(segmentText);
      if (row.getTs() != null) {
        b.datasetTimestamp(row.getTs());
      }

      val ingestionMarker = b.build();
      return Arrays.asList(ingestionMarker).iterator();
    }

    val builder =
        DatalakeRowV1.builder()
            .datalakeWriteTs(row.getDatalakeWriteTs())
            .ingestionOrigin(row.getIngestionOrigin())
            .datasetId(row.getDatasetId())
            .orgId(row.getOrgId())
            .type(row.getType())
            .segmentText(segmentText)
            .referenceProfileId(row.getProfileId())
            .lastUploadTs(row.getLastUploadTs())
            .datalakeWriteTs(row.getDatalakeWriteTs());

    if (row.getTs() == null) {
      return Collections.emptyIterator();
    }

    /**
     * Tags in the V1 world aren't from the dataset being grouped by [whatever], its more of a
     * dataset level operational tag. These don't exist in the V0 world which is why they're always
     * null. EG
     *
     * <p>segment: car=honda/subaru/ford tag: environment=dev/prod
     */
    builder.datasetTags(null);

    /* Determine profile format (V0 or V1) and create appropriate type of iterator to process the profile.
     */
    val bis = new BufferedInputStream(new ByteArrayInputStream(row.getContent()));
    Iterator<IMetricsIterator> it = Collections.emptyIterator();
    try {
      IMetricsIterator mit = new V1ChunkIterator(bis, null, row.getOriginalFilename());
      if (mit.hasNext()) {
        // TODO iterate over multiple delimited regions in a single file.
        it = singletonList(mit).iterator();
      }
      // TODO return iterator of iterators.
    } catch (Exception e) {
      IMetricsIterator mit = new V0toV1StreamIterator(bis, null);
      if (mit.hasNext()) {
        it = singletonList(mit).iterator();
      }
    }

    Boolean enableGranularDataStorage = false;
    IngestionRollupGranularity ingestionGranularity = IngestionRollupGranularity.hourly;
    if (org != null) {
      enableGranularDataStorage = org.getEnableGranularDataStorage();
      ingestionGranularity = org.getIngestionGranularity();
    }

    val i =
        new ProfileToDatalakeRows(row.getDatalakeWriteTs())
            .iterateRows(it, builder, enableGranularDataStorage, ingestionGranularity)
            .iterator();
    return i;
  }
}
