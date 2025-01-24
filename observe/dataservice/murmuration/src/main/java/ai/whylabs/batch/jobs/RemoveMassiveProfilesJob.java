package ai.whylabs.batch.jobs;

import static org.apache.spark.sql.functions.udf;

import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import ai.whylabs.batch.udfs.DetermineLength;
import ai.whylabs.batch.udfs.ScrubUnusedProfileElements;
import ai.whylabs.core.structures.DatalakeRow.Fields;
import com.beust.jcommander.JCommander.Builder;
import com.beust.jcommander.Parameter;
import io.delta.tables.DeltaTable;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.DataTypes;

/**
 * Our old char count sketch is bloated and unused. Also the compactTheta in number tracker never
 * gets used. Together these account for %75 of our profile storage, so clearing them out saves us a
 * lot of IO/CPU/Storage and hopefully help us get past some datalake writer/compaction job OOMs.
 */
@Slf4j
public class RemoveMassiveProfilesJob extends AbstractSparkJob {

  @Parameter(
      names = {"-location", "-datalake"},
      description =
          "optional deltalake location for profiles destined for druid; if supplied, matching entries will be deleted.")
  private String profilesDatalake;

  private static final String OLD_CONTENT = "oldContent";

  public Dataset<Row> calculate() {
    UserDefinedFunction determineLength = udf(new DetermineLength(), DataTypes.LongType);
    UserDefinedFunction removeUnusedElements =
        udf(new ScrubUnusedProfileElements(), DataTypes.BinaryType);
    spark.udf().register(ScrubUnusedProfileElements.name, removeUnusedElements);
    spark.udf().register(DetermineLength.name, determineLength);

    Map<String, String> expressions = new HashMap<>();
    expressions.put(
        Fields.content,
        "" + ScrubUnusedProfileElements.name + "(" + Fields.content + ", " + Fields.type + ")");
    expressions.put(Fields.length, "" + DetermineLength.name + "(" + Fields.content + ")");
    DeltaTable.forPath(spark, profilesDatalake).updateExpr(expressions);
    return null;
  }

  @Override
  protected Builder parserBuilder() {
    // do not accept unknown options
    return super.parserBuilder().acceptUnknownOptions(false);
  }

  public static void main(String[] args) {
    new RemoveMassiveProfilesJob().run(args);
  }
}
