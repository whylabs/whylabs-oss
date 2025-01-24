package ai.whylabs.druid.whylogs.util;

import com.google.common.collect.ImmutableMap;
import com.whylogs.core.DatasetProfile;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import lombok.SneakyThrows;

public class GenerateLargeProfile {

  @SneakyThrows
  public static void main(String[] args) {

    final String sessionId = UUID.randomUUID().toString();

    final Map<String, String> tags =
        ImmutableMap.of("tag", "tagValue", "orgId", "org-4155", "datasetId", "model-4");

    final DatasetProfile profile =
        new DatasetProfile(sessionId, Instant.now(), Instant.now(), tags, Collections.emptyMap());
    profile.track("my_feature", 1);
    profile.track("my_feature", "stringValue");
    profile.track("my_feature", 1.0);

    Random r = new Random();

    for (int n = 0; n < 100; n++) {
      final HashMap<String, Object> dataMap = new HashMap<>();

      // Produces a 294MB sized profile
      for (int x = 0; x < 8000; x++) {
        dataMap.put("double_feature_with_long_title" + x, r.nextDouble());
        dataMap.put("string_feature_with_long_title" + x, UUID.randomUUID().toString());
      }

      profile.track(dataMap);
    }

    try (final OutputStream fos = Files.newOutputStream(Paths.get("/tmp/big_profile.bin"))) {
      profile.toProtobuf().build().writeDelimitedTo(fos);
    }
  }
}
