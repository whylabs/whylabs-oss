package ai.whylabs.batch.jobs;

import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import com.beust.jcommander.Parameter;
import java.net.URI;
import java.util.Arrays;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.FileSystem;
import org.apache.hadoop.fs.Path;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import scala.collection.JavaConverters;

public class Benchmark extends AbstractSparkJob {

  @Parameter(
      names = "-source",
      description = "Input file glob for bin files we want to write to the deltalake",
      required = false)
  private String source;

  @SneakyThrows
  @Override
  public Dataset<Row> calculate() {
    long start = System.currentTimeMillis();
    spark
        .read() //
        .format("binaryFile") //
        .load(JavaConverters.asScalaBuffer(Arrays.asList(source)))
        .count();
    System.out.println(
        "Without dropping content column took " + (System.currentTimeMillis() - start));

    start = System.currentTimeMillis();
    spark
        .read() //
        .format("binaryFile") //
        .load(JavaConverters.asScalaBuffer(Arrays.asList(source)))
        .drop("content")
        .count();

    System.out.println("Dropping content column took " + (System.currentTimeMillis() - start));

    start = System.currentTimeMillis();
    val fs = FileSystem.get(new URI(source), new Configuration());
    val i = fs.listFiles(new Path(source), false);
    while (i.hasNext()) {
      val n = i.next();
      n.getModificationTime();
    }
    System.out.println("Hadoop list took " + (System.currentTimeMillis() - start));

    return null;
  }

  public static void main(String[] args) {
    try (val job = new Benchmark()) {
      job.run(args);
    }
  }
}
