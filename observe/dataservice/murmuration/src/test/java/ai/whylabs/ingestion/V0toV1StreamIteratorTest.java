package ai.whylabs.ingestion;

import static ai.whylabs.druid.whylogs.column.DatasetProfileMessageWrapper.TAG_PREFIX;
import static ai.whylabs.druid.whylogs.column.DatasetProfileMessageWrapper.TAG_PREFIX_LEN;
import static ai.whylabs.druid.whylogs.metadata.BinMetadataEnforcer.MAPPER;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.collection.IsCollectionWithSize.hasSize;

import ai.whylabs.druid.whylogs.metadata.BinMetadata;
import com.google.common.base.Preconditions;
import com.whylogs.core.message.DatasetSegmentHeader;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import com.whylogs.v0.core.message.DatasetPropertiesV0;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Map;
import java.util.Map.Entry;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.Cleanup;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.apache.druid.java.util.common.io.Closer;
import org.testng.annotations.AfterTest;
import org.testng.annotations.BeforeTest;
import org.testng.annotations.Test;

public class V0toV1StreamIteratorTest {

  public static final String SEGMENTED_V0_PROFILE =
      "/reference-profiles/2021-05-28/org-0-model-0-3OAzVit8a521yyCppfaP2ZEHcZtWwcWR.bin";
  public static final String SEGMENTED_V0_JSON =
      "/reference-profiles/2021-05-28/org-0-model-0-3OAzVit8a521yyCppfaP2ZEHcZtWwcWR.json";

  public static final String V0_PROFILE_BADDATE_PROFILE =
      "/profiles/bad_timestamp_test_profile.bin";
  public static final String V0_PROFILE_BADDATE_JSON = "/profiles/bad_timestamp_test_profile.json";

  public static final String MAGIC_HEADER = "WHY1";
  private static final int HEADER_LENGTH = MAGIC_HEADER.length();

  Closer closer;

  @BeforeTest
  public void createCloser() {
    closer = Closer.create();
  }

  @AfterTest
  public void cleanup() throws IOException {
    closer.close();
  }

  @SneakyThrows
  @Test
  public void testIngestV0() {
    @Cleanup val is = readResource(SEGMENTED_V0_PROFILE);
    closer.register(is);

    String json =
        "{\"id\":null,\"orgId\":\"orgid-from-json\",\"datasetId\":\"datasetid-from-json\",\"datasetTimestamp\":1649973867514,\"uploadKeyId\":\"222222222222\",\"tags\":{\"tags\":[]}}";
    val metadata = MAPPER.readValue(json, BinMetadata.class);

    val bis = new BufferedInputStream(is);
    val it = new V0toV1StreamIterator(bis, metadata);

    int c = 0;
    while (it.hasNext()) {
      it.next();
      c++;
    }
    assertThat(c, is(104));

    // orgid and datasetid come from json metadata
    assertThat(it.getMetadata().getProperties().getTagsMap().get("orgId"), is("orgid-from-json"));
    assertThat(
        it.getMetadata().getProperties().getTagsMap().get("datasetId"), is("datasetid-from-json"));

    // timestamp in profile headers is bogus == '2'.
    // Correct timestamp comes from JSON metadata.
    val ts = it.getMetadata().getProperties().getDatasetTimestamp();
    assertThat(ts, is(1649973867514L));
  }

  @SneakyThrows
  @Test
  public void testSegmentHeader() {
    @Cleanup val inputStream = readResource(SEGMENTED_V0_PROFILE);
    @Cleanup val jsonStream = readResource(SEGMENTED_V0_JSON);

    // despite the naming, this json metadata does not contain segment tags.
    // So this test is extracting segments only from the profile tags.
    val metadata =
        MAPPER.readValue(IOUtils.toString(jsonStream, StandardCharsets.UTF_8), BinMetadata.class);

    val bis = new BufferedInputStream(inputStream);
    val msg = DatasetProfileMessage.parseDelimitedFrom(bis);

    // segment tags only in profile properties
    DatasetSegmentHeader header = V1Metadata.mkSegmentHeader(msg.getProperties(), metadata);
    assertThat(header.getHasSegments(), is(true));
    assertThat(header.getSegmentsList(), hasSize(1));

    // no segment tags in either profile properties or metadata
    val nonSegmentTags =
        msg.getProperties().getTagsMap().entrySet().stream()
            .filter(e -> !e.getKey().startsWith(TAG_PREFIX))
            .collect(Collectors.toMap(Entry::getValue, Entry::getKey));
    val properties =
        DatasetPropertiesV0.newBuilder(msg.getProperties())
            .clearTags()
            .putAllTags(nonSegmentTags)
            .build();
    header = V1Metadata.mkSegmentHeader(properties, metadata);
    assertThat(header.getHasSegments(), is(false));
    assertThat(header.getSegmentsList(), hasSize(1));

    // segment tags only in metadata

    val metatags =
        msg
            .getProperties()
            .getTagsMap() //
            .entrySet() //
            .stream() //
            .filter(e -> e.getKey().startsWith(TAG_PREFIX))

            // segment tags list must be sorted by feature name, then value.
            .sorted(
                Map.Entry.<String, String>comparingByKey()
                    .thenComparing(Map.Entry.comparingByValue()))

            // segment tags in metadata are a list of dicts like this,
            //     [{"key":"purpose","value":"moving"},
            //      {"key":"verification_status","value":"Source Verified"}]
            .map(
                e ->
                    Stream.of(
                            new String[][] {
                              {"key", e.getKey().substring(TAG_PREFIX_LEN)},
                              {"value", e.getValue()},
                            })
                        .collect(Collectors.toMap(data -> data[0], data -> data[1])))
            .collect(Collectors.toList());

    metadata.setTags(Collections.singletonMap("tags", metatags));
    header = V1Metadata.mkSegmentHeader(properties, metadata);
    assertThat(header.getHasSegments(), is(true));
    assertThat(header.getSegmentsList(), hasSize(1));
  }

  private void checkMagicHeader(BufferedInputStream bif) throws IOException {
    byte[] headerBuf = new byte[HEADER_LENGTH];
    int readBytes = bif.read(headerBuf);
    assertThat(readBytes, is(greaterThanOrEqualTo(HEADER_LENGTH)));
    String headerText = new String(headerBuf, StandardCharsets.UTF_8);
    assertThat(headerText, is(MAGIC_HEADER));
  }

  @NonNull
  private InputStream readResource(String fileName) {
    val stream = getClass().getResourceAsStream(fileName);
    Preconditions.checkNotNull(stream, "Resource not available: " + fileName);
    return stream;
  }
}
