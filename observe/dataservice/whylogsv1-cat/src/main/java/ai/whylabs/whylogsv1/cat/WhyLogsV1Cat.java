package ai.whylabs.whylogsv1.cat;

import ai.whylabs.whylogsv1.WhyLogsV1Parser;
import ai.whylabs.whylogsv1.metrics.WhyLogMetric;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.concurrent.Callable;
import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Parameters;

@Command(name = "whylogsv1-cat", description = "Pretty print a WhyLogsV1 binary file")
public class WhyLogsV1Cat implements Callable<Integer> {

  @Parameters(index = "0", description = "The WhyLogsV1 file to parse")
  private File file;

  public static void main(String[] args) {
    int exitCode = new CommandLine(new WhyLogsV1Cat()).execute(args);
    System.exit(exitCode);
  }

  @Override
  public Integer call() throws Exception {
    try {
      BufferedInputStream bis = new BufferedInputStream(new FileInputStream(file));
      WhyLogsV1Parser parser = new WhyLogsV1Parser(bis);

      for (WhyLogsV1Parser it = parser; it.hasNext(); ) {
        WhyLogMetric whyLogMetric = it.next();
        System.out.println(whyLogMetric);
      }
    } catch (Exception e) {
      System.err.println("Encountered exception: ");
      e.printStackTrace(System.err);
      return -1;
    }
    return 0;
  }
}
