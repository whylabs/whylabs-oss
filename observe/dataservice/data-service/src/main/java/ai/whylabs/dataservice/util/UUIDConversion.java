package ai.whylabs.dataservice.util;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.val;

public class UUIDConversion {
  public static List<UUID> toUUID(List<String> uuidStrings) {
    List<UUID> uuids = new ArrayList<>();
    if (uuidStrings != null) {
      for (val u : uuidStrings) {
        uuids.add(UUID.fromString(u));
      }
    }
    return uuids;
  }

  // Made a single value version so that we can be uniform in our application of the
  // toUUID method in the various services...
  public static UUID toUUID(String uuidString) {
    return UUID.fromString(uuidString);
  }
}
