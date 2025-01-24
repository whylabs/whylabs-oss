package ai.whylabs.batch.utils;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.lit;

import ai.whylabs.core.enums.ProfileColumnType;
import ai.whylabs.core.structures.DatalakeRow.Fields;
import io.delta.tables.DeltaTable;
import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;

@Slf4j
@UtilityClass
public class TableUtils {
  public Dataset<Row> readLatestVersion(String path) {
    val spark = getSparkSession();

    val table = DeltaTable.forPath(spark, path);
    val version = table.history(1).select("version").collectAsList().get(0).getLong(0);

    log.info("Reading version {} for table at path: {}", version, path);
    return spark
        .read()
        .format("delta")
        .option("versionAsOf", version)
        .load(path)
        .filter(col(Fields.type).equalTo(lit(ProfileColumnType.MERGED.name())));
  }

  private SparkSession getSparkSession() {
    return SparkSession.getActiveSession()
        .getOrElse(
            () -> {
              throw new IllegalArgumentException("Could not find active SparkSession");
            });
  }
}
