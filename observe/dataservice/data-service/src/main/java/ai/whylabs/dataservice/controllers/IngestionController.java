package ai.whylabs.dataservice.controllers;

import ai.whylabs.dataservice.services.ProfileService;
import io.micrometer.core.instrument.MeterRegistry;
import io.micronaut.context.annotation.Requires;
import io.micronaut.scheduling.annotation.Scheduled;
import jakarta.inject.Singleton;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * enable periodic ingestion of profiles in pending state.
 *
 * <p>a bit of a hack - we really want to run ingestion on kinesis-enabled pods so they can send out
 * entity-schema messages. However, kinesis is disabled when running locally, so created a new
 * feature flag to explicitly enable "live" ingestion even when kinesis is turned off.
 */
@Slf4j
@Singleton
@RequiredArgsConstructor
@Requires(property = "whylabs.dataservice.enableLiveIngestion", value = "true")
public class IngestionController {

  @Inject private final ProfileService profileService;

  @Inject private final MeterRegistry meterRegistry;

  /**
   * Automatic ingestion of pending profiles in the audit table.
   *
   * <p>No advisory lock on this path - we WANT to run ingestion in parallel on each container.
   *
   * <p>Note: should only run on nodes where entitySchema kinesis messages may be sent.
   */
  @Scheduled(fixedDelay = "1s")
  @SuppressWarnings("unused")
  void ingestPending() {
    // only run in containers that can generate entity schema
    // messages.
    try {
      profileService.ingestPending();
    } catch (Exception e) {
      meterRegistry.counter("whylabs.ingestion.error").increment();
      log.error("Error scanning for pending profiles", e);
    }
  }
}
