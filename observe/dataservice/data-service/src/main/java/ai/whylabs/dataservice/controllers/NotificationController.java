package ai.whylabs.dataservice.controllers;

import ai.whylabs.dataservice.requests.AckDigestRequest;
import ai.whylabs.dataservice.services.NotificationService;
import io.micrometer.core.instrument.MeterRegistry;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.http.exceptions.HttpStatusException;
import io.swagger.v3.oas.annotations.tags.Tag;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Tag(name = "Notifications")
@Controller("/notification")
@RequiredArgsConstructor
public class NotificationController {
  @Inject private final NotificationService notificationService;

  @Inject private final MeterRegistry meterRegistry;

  @Post(
      uri = "/acknowledge",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void acknowledgeImmediateDigest(@Body AckDigestRequest rqst) {
    if (!rqst.validate()) {
      throw new HttpStatusException(
          HttpStatus.BAD_REQUEST, "request must supply non-null values for all fields");
    }
    int nrows = notificationService.ackImmediateDigest(rqst);
    if (nrows != 1) {
      throw new HttpStatusException(HttpStatus.GONE, "Could not acknowledged missing record");
    }
  }
}
