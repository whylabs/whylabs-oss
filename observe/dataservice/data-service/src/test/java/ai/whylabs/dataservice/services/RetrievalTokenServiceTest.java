package ai.whylabs.dataservice.services;

import static org.junit.jupiter.api.Assertions.assertTrue;

import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.dataservice.requests.ProfileRollupRequest;
import ai.whylabs.dataservice.requests.SegmentTag;
import ai.whylabs.dataservice.tokens.RetrievalTokenService;
import ai.whylabs.dataservice.tokens.RetrievalTokenV1;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import java.util.Arrays;
import javax.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.joda.time.Interval;
import org.junit.jupiter.api.Test;

@MicronautTest
@Slf4j
public class RetrievalTokenServiceTest extends BasePostgresTest {
  @Inject private RetrievalTokenService retrievalTokenService;

  @Test
  public void testToken() {
    val token =
        RetrievalTokenV1.builder()
            .interval(new Interval(0, 1))
            .traceId("trace")
            .segmentTags(Arrays.asList(SegmentTag.builder().key("a").value("b").build()));
    val tokenString = retrievalTokenService.toString(token.build());
    val req =
        ProfileRollupRequest.builder()
            .granularity(DataGranularity.daily)
            .retrievalToken(tokenString)
            .build();
    retrievalTokenService.apply(req);
    assertTrue(req.getSegment() != null);
    assertTrue(req.getInterval() != null);
    assertTrue(req.getTraceId() != null);
  }
}
