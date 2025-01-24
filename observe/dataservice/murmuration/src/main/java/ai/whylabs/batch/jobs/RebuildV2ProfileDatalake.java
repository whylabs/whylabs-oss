package ai.whylabs.batch.jobs;

import static org.apache.spark.sql.functions.col;

import ai.whylabs.batch.MapFunctions.ProfilesDatalakeV0ToV1Row;
import ai.whylabs.batch.MapFunctions.ReadOrgConfigJson;
import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import ai.whylabs.batch.utils.DeltalakeWriter;
import ai.whylabs.batch.utils.FillMissingColumns;
import ai.whylabs.core.structures.DatalakeRow;
import ai.whylabs.core.structures.DatalakeRowV1;
import ai.whylabs.core.structures.DatalakeRowV2;
import ai.whylabs.core.structures.Org;
import com.beust.jcommander.Parameter;
import io.delta.tables.DeltaTable;
import java.util.ArrayList;
import java.util.Arrays;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.*;

@Slf4j
public class RebuildV2ProfileDatalake extends AbstractSparkJob {

  @Parameter(names = "-v0profiles", description = "Location of delta lake", required = true)
  private String v0profiles;

  @Parameter(names = "-v2profiles", description = "Org Id to copy data from", required = true)
  private String v2profiles;

  @Parameter(names = "-orgs", description = "Org Id to copy data from", required = false)
  private String orgConfig;

  @Override
  public Dataset<Row> calculate() {
    Dataset<DatalakeRowV2> ge =
        DeltaTable.forPath(spark, v2profiles)
            .toDF()
            .filter(
                col(DatalakeRowV2.Fields.orgId)
                    .equalTo(functions.lit("org-5sDdCa"))
                    .or(col(DatalakeRowV2.Fields.orgId).equalTo("org-7wNpPp"))
                    .or(col(DatalakeRowV2.Fields.orgId).equalTo("org-9rXVqf"))
                    .or(col(DatalakeRowV2.Fields.orgId).equalTo("org-rffTaS")))
            .as(Encoders.bean(DatalakeRowV2.class));

    Dataset<Org> orgs;
    if (orgConfig == null) {
      orgs = spark.createDataset(new ArrayList<>(), Encoders.bean(Org.class));

    } else {
      orgs =
          spark.read().text(orgConfig).flatMap(new ReadOrgConfigJson(), Encoders.bean(Org.class));
    }

    val v0 =
        FillMissingColumns.fillMissingColumnsWitNulls(
                DeltaTable.forPath(spark, v0profiles)
                    .toDF()
                    .filter(
                        col(DatalakeRowV2.Fields.orgId)
                            .notEqual(functions.lit("org-5sDdCa"))
                            .or(col(DatalakeRowV2.Fields.orgId).notEqual("org-7wNpPp"))
                            .or(col(DatalakeRowV2.Fields.orgId).notEqual("org-9rXVqf"))
                            .or(col(DatalakeRowV2.Fields.orgId).notEqual("org-rffTaS"))),
                DatalakeRow.class.getDeclaredFields())
            .as(Encoders.bean(DatalakeRow.class));
    val v1 =
        v0.joinWith(
                orgs, v0.col(DatalakeRow.Fields.orgId).equalTo(orgs.col(Org.Fields.orgId)), "left")
            .flatMap(new ProfilesDatalakeV0ToV1Row(), Encoders.bean(DatalakeRowV1.class));

    Dataset<DatalakeRowV2> v2 =
        MigrateV2ProfileDatalake.convert(
            v1.na()
                .fill(
                    false,
                    Arrays.asList(DatalakeRowV1.Fields.enableGranularDataStorage)
                        .toArray(new String[] {}))
                .as(Encoders.bean(DatalakeRowV1.class)));

    v2.unionAll(ge)
        .sort(col(DatalakeRowV2.Fields.yyyymmdd))
        .write()
        .format(DeltalakeWriter.DELTA)
        .mode(SaveMode.Overwrite)
        .option("overwriteSchema", "true")
        .partitionBy(DatalakeRowV2.Fields.yyyymmdd)
        .save(v2profiles);

    return null;
  }

  public static void main(String[] args) {
    new RebuildV2ProfileDatalake().run(args);
  }
}
