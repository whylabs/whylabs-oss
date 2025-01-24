package ai.whylabs.batch.jobs;

import ai.whylabs.druid.whylogs.column.DatasetProfileMessageWrapper;
import com.beust.jcommander.JCommander;
import com.beust.jcommander.Parameter;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import java.io.InputStream;
import java.net.URI;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.FileSystem;
import org.apache.hadoop.fs.Path;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;

@Slf4j
public class AnalyzeBinFiles {

  @Parameter(names = "-path", description = "Path of files to analyze", required = true)
  private String path;

  public static void main(String[] args) {
    DateTimeZone.setDefault(DateTimeZone.UTC);

    val job = new AnalyzeBinFiles();
    job.run(args);
  }

  @SneakyThrows
  public Dataset<Row> run(String[] args) {
    JCommander.newBuilder().acceptUnknownOptions(true).addObject(this).build().parse(args);
    DateTimeZone.setDefault(DateTimeZone.UTC);
    FileSystem fs = FileSystem.get(new URI(path), new Configuration());

    val list = fs.listFiles(new Path(path), true);
    while (list.hasNext()) {
      val file = list.next();
      int count = 0;
      if (!file.getPath().toString().endsWith(".bin")) {
        continue;
      }
      try (final InputStream is = fs.open(file.getPath())) {
        while (true) {
          DatasetProfileMessage msg = DatasetProfileMessage.parseDelimitedFrom(is);
          if (msg == null) {
            break;
          } else {
            val w = new DatasetProfileMessageWrapper(msg);

            String orgId = "";
            String datasetId = "";
            String ts = "";
            try {
              orgId = w.getOrgId();
            } catch (NullPointerException e) {
            }
            try {
              datasetId = w.getDatasetMetrics().getDatasetId();
            } catch (NullPointerException e) {
            }
            try {
              ts =
                  new DateTime(w.getDatasetMetrics().getTimestampFromEpoch(), DateTimeZone.UTC)
                      .toString();
            } catch (NullPointerException e) {
            }

            log.info(
                "File "
                    + file.getPath()
                    + " "
                    + orgId
                    + " "
                    + datasetId
                    + " "
                    + ts
                    + " "
                    + w.getTags()
                    + " tags "
                    + w.getColumnCount()
                    + " columns ");
            count++;
          }
        }
      }
      log.info("File " + file.getPath() + " had " + count + " profiles");
    }

    return null;
  }
}
