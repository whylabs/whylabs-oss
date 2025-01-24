package ai.whylabs.ingestion;

import static ai.whylabs.druid.whylogs.column.WhyLogsRow.DATASET_ID;
import static ai.whylabs.druid.whylogs.column.WhyLogsRow.ORG_ID;
import static ai.whylabs.druid.whylogs.metadata.BinMetadataEnforcer.MAPPER;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.hasEntry;
import static org.hamcrest.Matchers.notNullValue;
import static org.testng.Assert.*;

import ai.whylabs.druid.whylogs.metadata.BinMetadata;
import com.google.common.base.Preconditions;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashSet;
import lombok.Cleanup;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.val;
import org.testng.annotations.Test;

public class V1ChunkIteratorTest {

  public static final String TOY_DATA = "v1-toydata.bin";
  public static final String LENDING_CLUB = "/v1/v1-lendingclub.bin";

  @Test
  @SneakyThrows(IOException.class)
  public void testIngestV1() {
    String json =
        "{\"id\":null,\"orgId\":\"orgid-from-json\",\"datasetId\":\"datasetid-from-json\",\"datasetTimestamp\":1649973867514,\"uploadKeyId\":\"222222222222\",\"tags\":{\"tags\":[]}}";
    val metadata = MAPPER.readValue(json, BinMetadata.class);
    @Cleanup val is = readResource(LENDING_CLUB);
    @Cleanup val bis = new BufferedInputStream(is);
    val it = new V1ChunkIterator(bis, metadata, LENDING_CLUB);
    int c = 0;
    val featureSet = new HashSet<String>();
    while (it.hasNext()) {
      val pair = it.next();
      featureSet.add(pair.getKey());
      c++;
    }
    assertEquals(c, featureSet.size());
    assertThat(c, is(151));
  }

  @Test
  @SneakyThrows(IOException.class)
  public void testEnforceProperties() {
    @Cleanup val is = readResource(LENDING_CLUB);
    assertThat(is, notNullValue());
    @Cleanup val bis = new BufferedInputStream(is);
    val json =
        "{\n"
            + "  \"id\": null,\n"
            + "  \"orgId\": \"org-from-json\",\n"
            + "  \"datasetId\": \"model-from-json\",\n"
            + "  \"datasetTimestamp\": \"1627865810000\",\n"
            + "  \"uploadKeyId\": \"KRgXmtLidI\",\n"
            + "  \"tags\": {\n"
            + "    \"tags\": [\n"
            + "      {\n"
            + "        \"key\": \"status\",\n"
            + "        \"value\": \"xdelivered\"\n"
            + "      },\n"
            + "      {\n"
            + "        \"key\": \"price\",\n"
            + "        \"value\": \"high\"\n"
            + "      }\n"
            + "    ]\n"
            + "  }\n"
            + "}";
    val metadata = MAPPER.readValue(json, BinMetadata.class);

    val it = new V1ChunkIterator(bis, metadata, LENDING_CLUB);
    assertTrue(it.hasNext());
    val headers = it.getMetadata();
    val properties = headers.getProperties();

    // assert that orgid/datasetid in binary profile overwrote properties in json metadata.
    assertThat(properties.getTagsMap(), hasEntry(ORG_ID, "org-from-json"));
    assertThat(properties.getTagsMap(), hasEntry(DATASET_ID, "model-from-json"));
    // assert that other properties in binary profile overwrote properties in json metadata.
    assertThat(properties.getTagsMap(), hasEntry("whylogs.tag.price", "high"));
    assertThat(properties.getTagsMap(), hasEntry("whylogs.tag.status", "xdelivered"));
    assertThat(properties.getDatasetTimestamp(), is(1627865810000L));
  }

  @NonNull
  private InputStream readResource(String fileName) {
    val stream = getClass().getResourceAsStream(fileName);
    Preconditions.checkNotNull(stream, "Resource not available: " + fileName);
    return stream;
  }
}
