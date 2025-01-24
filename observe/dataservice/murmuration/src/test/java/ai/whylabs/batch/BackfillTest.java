package ai.whylabs.batch;

import static org.testng.AssertJUnit.assertEquals;

import ai.whylabs.core.structures.BackfillAnalyzerRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Arrays;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.testng.annotations.Test;

@Slf4j
public class BackfillTest {

  @Test
  public void testSerde() throws JsonProcessingException {
    ZonedDateTime start = ZonedDateTime.of(2022, 7, 1, 1, 0, 0, 0, ZoneOffset.UTC);
    ZonedDateTime end = ZonedDateTime.of(2022, 7, 15, 1, 0, 0, 0, ZoneOffset.UTC);

    val b =
        BackfillAnalyzerRequest.builder()
            .orgId("org-0")
            .datasetId("model-2144")
            .start(start.toInstant().toEpochMilli())
            .end(end.toInstant().toEpochMilli())
            .overwrite(true)
            .analyzers(Arrays.asList("stddev-analyzer"))
            .build();
    ObjectMapper MAPPER = new ObjectMapper();
    String s = MAPPER.writeValueAsString(b);
    MAPPER.readValue(s, BackfillAnalyzerRequest.class);
    String s2 = MAPPER.writeValueAsString(b);
    assertEquals(s, s2);
    log.info(s);
  }
}
