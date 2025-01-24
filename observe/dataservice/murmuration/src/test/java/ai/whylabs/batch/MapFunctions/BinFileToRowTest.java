package ai.whylabs.batch.MapFunctions;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.testng.AssertJUnit.assertTrue;

import ai.whylabs.core.enums.IngestionOrigin;
import ai.whylabs.core.structures.BinaryProfileRow;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Iterators;
import com.whylogs.core.DatasetProfile;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import java.io.FileInputStream;
import java.io.InputStream;
import java.sql.Timestamp;
import java.time.Instant;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.testng.annotations.Test;

public class BinFileToRowTest {

  public static final BinFileToRow BIN_TO_RECORD_ENTRY =
      new BinFileToRow(System.currentTimeMillis());
  public static final Instant FAKE_TS = Instant.ofEpochMilli(1000000);

  @Test
  public void missingOrgId() throws Exception {
    val profile = new DatasetProfile("test", Instant.now());
    val bytes = profile.toBytes();
    BinaryProfileRow row =
        new BinaryProfileRow(
            "s3://path",
            new Timestamp(FAKE_TS.toEpochMilli()),
            (long) bytes.length,
            bytes,
            "",
            null);
    assertThat(Iterators.size(BIN_TO_RECORD_ENTRY.call(row)), is(0));
  }

  @Test
  public void testDemoData() throws Exception {
    try (final InputStream is =
        new FileInputStream("src/test/resources/profiles/2021-05-14/profiles-v1.bin")) {
      final DatasetProfileMessage msg = DatasetProfileMessage.parseDelimitedFrom(is);
      final DatasetProfile profile = DatasetProfile.fromProtobuf(msg);

      val bytes = profile.toBytes();
      BinaryProfileRow row =
          new BinaryProfileRow(
              "s3://songbird/demo-data/2021-11-11/org-0-model-0-2021-11-11T17:00:00-0e37cf4dd4c44fbb86cf02a3397f96e4.bin",
              new Timestamp(FAKE_TS.toEpochMilli()),
              (long) bytes.length,
              bytes,
              "",
              null);
      assertTrue(
          BIN_TO_RECORD_ENTRY
              .call(row)
              .next()
              .getIngestionOrigin()
              .equals(IngestionOrigin.DemoData));
    }
  }

  @Test
  public void testV1Data() throws Exception {
    InputStream is = getClass().getResourceAsStream("/v1/v1-lendingclub.bin");
    assertThat(is, notNullValue());
    byte[] bytes = IOUtils.toByteArray(is);
    BinaryProfileRow row =
        new BinaryProfileRow(
            "s3://songbird/path",
            new Timestamp(FAKE_TS.toEpochMilli()),
            (long) bytes.length,
            bytes,
            "",
            null);
    assertThat(Iterators.size(BIN_TO_RECORD_ENTRY.call(row)), is(1));
  }

  @Test
  public void missingDatasetId() throws Exception {
    val profile = new DatasetProfile("test", Instant.now(), ImmutableMap.of("orgId", "org-123"));
    val bytes = profile.toBytes();
    BinaryProfileRow row =
        new BinaryProfileRow(
            "s3://path",
            new Timestamp(FAKE_TS.toEpochMilli()),
            (long) bytes.length,
            bytes,
            "",
            null);
    assertThat(Iterators.size(BIN_TO_RECORD_ENTRY.call(row)), is(0));
  }

  @Test
  public void missingTimestamp() throws Exception {
    val profile =
        new DatasetProfile(
            "test",
            Instant.now(),
            Instant.ofEpochMilli(0),
            ImmutableMap.of("orgId", "org-123", "datasetId", "dataset-1"),
            ImmutableMap.of());
    val bytes = profile.toBytes();

    BinaryProfileRow row =
        new BinaryProfileRow(
            "s3://path",
            new Timestamp(FAKE_TS.toEpochMilli()),
            (long) bytes.length,
            bytes,
            "",
            null);

    val it = BIN_TO_RECORD_ENTRY.call(row);
    assertThat(it.hasNext(), is(true));
    val res = it.next();
    assertThat(res.getTs(), is(FAKE_TS.toEpochMilli()));
  }

  @Test
  public void handleInvalidProtobuf() throws Exception {
    val fakeTs = Instant.ofEpochMilli(1000000);
    BinaryProfileRow row =
        new BinaryProfileRow(
            "s3://path", new Timestamp(fakeTs.toEpochMilli()), (long) 1, new byte[1], "", null);

    assertThat(Iterators.size(BIN_TO_RECORD_ENTRY.call(row)), is(0));
  }
}
