package ai.whylabs.batch.jobs;

import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

public class ReplaySirenJob extends EventsJobV3 {

  @Override
  public Dataset<Row> calculate() {
    return null;
  }

  public static void main(String[] args) {
    val j = new ReplaySirenJob();
    j.apply(args);
    j.start();
    j.runBefore();
    j.sinkDigestsSiren();
    j.sinkAnalysisToPostgres();
    j.sinkAnomaliesToSiren();
  }
}
