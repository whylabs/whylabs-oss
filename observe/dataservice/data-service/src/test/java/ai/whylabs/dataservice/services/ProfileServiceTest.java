package ai.whylabs.dataservice.services;

import static ai.whylabs.dataservice.streaming.AuditRow.IngestState.processing;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertThrows;

import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.streaming.AuditRow;
import java.math.BigInteger;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import javax.inject.Inject;
import javax.persistence.PersistenceException;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.hibernate.exception.GenericJDBCException;
import org.junit.jupiter.api.Test;
import org.postgresql.util.PSQLException;

@Slf4j
public class ProfileServiceTest extends BasePostgresTest {
  @Inject private ProfileService profileService;

  /** verify state machine does not update if audit table row is locked */
  @SneakyThrows
  @Test
  void testStealLock() {
    AuditRow auditRow =
        AuditRow.builder()
            .filePath("test/testStealLock")
            .orgId("org-test")
            .datasetId("model-test")
            .datasetTs(Instant.now().toEpochMilli())
            .build();
    assertThat(profileService.createAuditLog(auditRow, "testing"), is(1));
    List<AuditRow> l0 =
        profileService.lockPending(1, UUID.fromString("A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11"));
    assertThat(l0, iterableWithSize(1));
    assertThat(l0.get(0).getDatasetId(), is("model-test"));
    assertThat(l0.get(0).getFilePath(), is("test/testStealLock"));

    // try to steal the lock with another uuid
    PersistenceException ex =
        assertThrows(
            PersistenceException.class,
            () ->
                profileService.updateAuditLog(
                    auditRow,
                    UUID.fromString("1c9b18f9-9947-4800-ba47-a27742b869a9"),
                    processing,
                    null));
    assertThat(ex.getCause(), isA(GenericJDBCException.class));
    GenericJDBCException jex = (GenericJDBCException) ex.getCause();
    assertThat(jex.getSQLException(), isA(PSQLException.class));
    assertThat(jex.getSQLException().getMessage(), containsString("stealing lock"));
  }

  /**
   * queryAuditStates returns the count of audit row in each state over a short, recent, interval
   * (default 1 minute)
   */
  @SneakyThrows
  @Test
  void testQueryAuditStates() {
    AuditRow meta =
        AuditRow.builder()
            .filePath("test/testAuditMetrics")
            .orgId("org-test")
            .datasetId("model-test")
            .datasetTs(Instant.now().toEpochMilli())
            .build();
    // initialize state and check metrics again
    assertThat(profileService.createAuditLog(meta, "testing"), is(1));
    Map<String, BigInteger> byAuditState = profileService.queryAuditStates();
    val states =
        Arrays.stream(AuditRow.IngestState.values())
            .map(AuditRow.IngestState::toString)
            .collect(Collectors.toList());
    for (val key : byAuditState.keySet()) {
      assertThat(key.toString(), in(states));
    }
    BigInteger pending = byAuditState.get("pending");
    BigInteger ingested = byAuditState.get("ingested");

    // update state and check metrics again
    assertThat(
        profileService.updateAuditLog(meta, null, AuditRow.IngestState.ingested, null), is(1));
    byAuditState = profileService.queryAuditStates();
    assertThat(byAuditState, hasEntry("pending", pending.subtract(BigInteger.valueOf(1L))));
    assertThat(byAuditState, hasEntry("ingested", ingested.add(BigInteger.valueOf(1L))));
  }

  @SneakyThrows
  @Test
  void testAuditSegments() {
    val now = Instant.now().toEpochMilli();
    AuditRow meta =
        AuditRow.builder()
            .filePath("test/testAuditMetrics")
            .orgId("org-test")
            .datasetId("model-test")
            .datasetTs(now)
            .build();
    // initialize state and check metrics again
    assertThat(profileService.createAuditLog(meta, "testing"), is(1));
    Map<String, BigInteger> byAuditState = profileService.queryAuditStates();
    val states =
        Arrays.stream(AuditRow.IngestState.values())
            .map(AuditRow.IngestState::toString)
            .collect(Collectors.toList());
    for (val key : byAuditState.keySet()) {
      assertThat(key.toString(), in(states));
    }
    BigInteger pending = byAuditState.get("pending");
    BigInteger ingested = byAuditState.get("ingested");

    // update state and check metrics again
    List<String> segments = new ArrayList<>();
    segments.add("house=blue");
    assertThat(
        profileService.updateAuditLog(meta, null, AuditRow.IngestState.ingested, null), is(1));
    byAuditState = profileService.queryAuditStates();
    assertThat(byAuditState, hasEntry("pending", pending.subtract(BigInteger.valueOf(1L))));
    assertThat(byAuditState, hasEntry("ingested", ingested.add(BigInteger.valueOf(1L))));
  }
}
