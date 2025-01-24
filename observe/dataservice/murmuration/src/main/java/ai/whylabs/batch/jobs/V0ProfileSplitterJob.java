package ai.whylabs.batch.jobs;

import static org.apache.spark.sql.functions.col;

import ai.whylabs.batch.MapFunctions.V0ProfileSplitter;
import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import ai.whylabs.batch.utils.FillMissingColumns;
import ai.whylabs.core.enums.ProfileColumnType;
import ai.whylabs.core.structures.DatalakeRow;
import com.beust.jcommander.JCommander;
import com.beust.jcommander.Parameter;
import io.delta.tables.DeltaTable;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;

public class V0ProfileSplitterJob extends AbstractSparkJob {
  public static final Integer SPLIT_THRESHOLD = 100;

  @Parameter(
      names = {"-location", "-datalake"},
      description =
          "optional deltalake location for profiles destined for druid; if supplied, matching entries will be deleted.")
  private String profilesDatalake;

  public Dataset<Row> calculate() {
    val bigProfiles =
        DeltaTable.forPath(spark, profilesDatalake)
            .toDF()
            .filter(col(DatalakeRow.Fields.type).equalTo(ProfileColumnType.MERGED.name()))
            .filter(col(DatalakeRow.Fields.numColumns).$greater(SPLIT_THRESHOLD));
    FillMissingColumns.fillMissingColumnsWitNulls(
            bigProfiles, DatalakeRow.class.getDeclaredFields())
        .as(Encoders.bean(DatalakeRow.class))
        .flatMap(new V0ProfileSplitter(), Encoders.bean(DatalakeRow.class))
        .write()
        .format("delta")
        .mode(SaveMode.Append)
        .save(profilesDatalake);

    DeltaTable.forPath(spark, profilesDatalake)
        .delete(
            col(DatalakeRow.Fields.type)
                .equalTo(ProfileColumnType.MERGED.name())
                .and(col(DatalakeRow.Fields.numColumns).$greater(SPLIT_THRESHOLD)));
    return null;
  }

  @Override
  protected JCommander.Builder parserBuilder() {
    // do not accept unknown options
    return super.parserBuilder().acceptUnknownOptions(false);
  }

  public static void main(String[] args) {
    new V0ProfileSplitterJob().run(args);
  }
}
