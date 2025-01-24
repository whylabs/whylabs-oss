package ai.whylabs.dataservice.calculations;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.anEmptyMap;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;

import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import com.google.common.base.Preconditions;
import com.shaded.whylabs.org.apache.datasketches.ArrayOfStringsSerDe;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import lombok.Cleanup;
import lombok.NonNull;
import lombok.val;
import org.junit.jupiter.api.Test;

public class FrequentStringsPostAggTest {
  // shares binary profile with testIngestProfile, but doesn't get ingested.
  public static final String SEGMENTED_V0_PROFILE =
      "/profiles/testIngestProfile/org-0-model-0-2023-01-25T220419.69-kUdbPsqADi1HTRNQDM65aWCkfi6sdHEc.bin";

  private static final ArrayOfStringsSerDe serde = new ArrayOfStringsSerDe();

  @Test
  public void testFrequentStringsFromProfile() throws IOException {
    val postagg = new FrequentStringsPostAgg();

    @Cleanup val is = readResource(SEGMENTED_V0_PROFILE);
    // this profile contains data from
    //     dataset_timestamp 2023-01-25T22:00:00.000Z
    //     org-0/model-0
    //     segment [purpose=major_purchase, verification_status=Source Verified]

    val bis = new BufferedInputStream(is);

    val msg = DatasetProfileMessage.parseDelimitedFrom(bis);
    val columnsMap = msg.getColumnsMap();
    for (val e : columnsMap.entrySet()) {
      val columnName = e.getKey();
      val columnMsg = e.getValue();
      val bytes = columnMsg.getFrequentItems().getSketch();
      val expected = DruidStringUtils.encodeBase64String(bytes.toByteArray());

      ItemsSketch<String> rehydrated = postagg.deserialize(expected);
      if (columnName.equals("acc_now_delinq")) {
        // asert values match observed values from druid.
        val summary = postagg.mkSummary(rehydrated);
        assertThat(summary.get("mapCapacity"), is(6));
        assertThat(summary.get("numActive"), is(2));
        assertThat((Map<String, ?>) (summary.get("items")), hasKey("-0.0"));
        assertThat((Map<String, ?>) (summary.get("items")), hasKey("0.0"));
        assertThat(
            ((Map<String, Map<String, Object>>) summary.get("items")).get("0.0").get("est"),
            is(100L));
        assertThat(
            ((Map<String, Map<String, Object>>) summary.get("items")).get("-0.0").get("est"),
            is(18L));
      }
      if (columnName.equals("annual_inc_joint")) {
        // asert values match observed values from druid.
        val summary = postagg.mkSummary(rehydrated);
        assertThat(summary.get("mapCapacity"), is(6));
        assertThat(summary.get("numActive"), is(0)); // empty sketch!
        assertThat((Map<String, ?>) (summary.get("items")), anEmptyMap());
      }
    }
  }

  @Test
  public void testFrequentStringsDecode() {
    // assert there are no exceptions when decoding sketchs from base64 strings.
    String[] base64Strings = {
      "BAEKBwMAAAABAAAAAAAAAL8BAAAAAAAAAAAAAAAAAAC/AQAAAAAAAAgAAABBcHItMjAxOQ==", "AQEKBwMBAAA="
    };
    val postagg = new FrequentStringsPostAgg();
    for (val str : base64Strings) {
      val sketch = postagg.deserialize(str);
    }
  }

  @NonNull
  private InputStream readResource(String fileName) {
    val stream = getClass().getResourceAsStream(fileName);
    Preconditions.checkNotNull(stream, "Resource not available: " + fileName);
    return stream;
  }
}
