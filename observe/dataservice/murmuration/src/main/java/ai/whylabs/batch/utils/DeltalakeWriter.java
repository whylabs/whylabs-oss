package ai.whylabs.batch.utils;

import com.google.common.base.Preconditions;
import io.delta.tables.DeltaMergeBuilder;
import io.delta.tables.DeltaTable;
import java.util.List;
import java.util.stream.Collectors;
import lombok.Builder;
import lombok.Singular;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.hadoop.fs.Path;
import org.apache.spark.sql.DataFrameWriter;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.functions;
import scala.collection.JavaConverters;

@Slf4j
@Builder
public class DeltalakeWriter {
  private final Dataset<Row> dataset;
  private final String path;
  private final DeltalakeMergeCondition mergeCondition;
  private boolean updateExisting;

  @Builder.Default private final boolean repartition = true;
  @Builder.Default private final int partitionSize = 200;
  public static final String DELTA = "delta";
  @Singular private final List<String> sortFields;
  @Singular private final List<String> partitionFields;

  @SneakyThrows
  public void execute() {
    Preconditions.checkNotNull(path, "path must be specified");
    Preconditions.checkNotNull(dataset, "dataset cannot be null");
    if (doesTableExist(path)) {
      Preconditions.checkArgument(
          !mergeCondition.getFields().isEmpty(), "Merge condition cannot be empty");
      val mc = mergeCondition.toString();
      log.info(
          "Delta table exists. Merge with existing table. Path: {}. Merge condition: {}", path, mc);

      DeltaMergeBuilder mergeBuilder =
          DeltaTable.forPath(path)
              .as(mergeCondition.getTable())
              .merge(dataset.as(mergeCondition.getSource()), mc)
              .whenNotMatched()
              .insertAll();
      if (updateExisting) {
        mergeBuilder = mergeBuilder.whenMatched().updateAll();
      }
      mergeBuilder.execute();
    } else {
      log.info("Delta table does not exist at path: {}. Writing new table", path);
      datasetWriter().mode(SaveMode.Overwrite).save(path);
    }
  }

  @SneakyThrows
  public static boolean doesTableExist(String path) {
    val conf = SparkSession.getActiveSession().get().sparkContext().hadoopConfiguration();
    return new Path(path).getFileSystem(conf).exists(new Path(path))
        && DeltaTable.isDeltaTable(path);
  }

  public DataFrameWriter<Row> datasetWriter() {
    Preconditions.checkArgument(partitionSize > 0, "Partition size must be greater than zero");
    Dataset<Row> reshaped = dataset;
    if (repartition) {
      val totalCount = reshaped.count();

      // first we need to repartition based on the partition fields
      val numPartitions = (totalCount + partitionSize) / partitionSize;
      log.info(
          "Repartitioning data to: {}. Partition size: {}. Total count: {}",
          numPartitions,
          partitionSize,
          totalCount);
      if (!partitionFields.isEmpty()) {
        log.info("Partition by fields: {}", partitionFields);
        val partitionByColumns =
            partitionFields.stream().map(functions::col).collect(Collectors.toList());
        val partitionExprs = JavaConverters.asScalaBuffer(partitionByColumns).toSeq();
        reshaped = reshaped.repartition((int) numPartitions, partitionExprs);
      } else {
        log.info("Repartitioning without partition fields");
        reshaped = reshaped.repartition((int) numPartitions);
      }
    }

    // then within each partition we need to sort them
    if (!sortFields.isEmpty()) {
      log.info("Sort by: {}", sortFields);

      val head = sortFields.get(0);
      if (sortFields.size() == 1) {
        reshaped = reshaped.sortWithinPartitions(head);
      } else {
        final String[] tail = sortFields.subList(1, sortFields.size()).toArray(new String[0]);
        reshaped = reshaped.sortWithinPartitions(head, tail);
      }
    }

    DataFrameWriter<Row> writer = reshaped.write();
    if (!partitionFields.isEmpty()) {
      log.info("Segregate output data by: {}", partitionFields);
      writer = writer.partitionBy(partitionFields.toArray(new String[0]));
    }

    return writer.format(DELTA);
  }
}
