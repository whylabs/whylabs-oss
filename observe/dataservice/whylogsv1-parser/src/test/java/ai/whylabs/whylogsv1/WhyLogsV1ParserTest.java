package ai.whylabs.whylogsv1;

import static org.testng.Assert.fail;
import static org.testng.AssertJUnit.assertEquals;

import ai.whylabs.whylogsv1.util.SuperSimpleInternalMetrics;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.util.HashMap;
import lombok.extern.slf4j.Slf4j;
import org.testng.annotations.Test;

@Slf4j
public class WhyLogsV1ParserTest {

  @Test
  public void testBasicFunctionality() throws IOException {
    HashMap<String, Integer> files = new HashMap<>();
    files.put("v1-lendingclub.bin", 1474);
    files.put("profile.bin", 32);
    files.put("v1-toydata.bin", 30);

    // Check that we get the expected number of metrics from our test input files
    for (String file : files.keySet()) {
      int expectedNumberOfMetrics = files.get(file);

      BufferedInputStream v1File = getAsStream("valid", file);

      WhyLogsV1Parser parser = new WhyLogsV1Parser(v1File);
      int count = 0;
      for (WhyLogsV1Parser it = parser; it.hasNext(); it.next()) {
        count++;
      }
      log.info(file + ":\n" + SuperSimpleInternalMetrics.METRICS().summarize());
      parser.close();
      assertEquals(
          String.format(
              "Number of expected metrics (%d) did not match actual (%d) for %s",
              expectedNumberOfMetrics, count, file),
          expectedNumberOfMetrics,
          count);
    }
  }

  @Test
  public void weBailOnBadHeaders() throws IOException {
    BufferedInputStream corruptedV1File = getAsStream("invalid", "corrupted_header.bin");

    try {
      WhyLogsV1Parser parser = new WhyLogsV1Parser(corruptedV1File);
    } catch (BadHeaderException bhe) {
      return;
    }
    fail("Should have failed on bad header.");
  }

  private BufferedInputStream getAsStream(String validOrInvalid, String fileName) {
    return new BufferedInputStream(
        getClass()
            .getClassLoader()
            .getResourceAsStream("profiles/" + validOrInvalid + "/" + fileName));
  }
}
