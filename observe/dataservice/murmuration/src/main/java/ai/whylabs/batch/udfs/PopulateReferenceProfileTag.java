package ai.whylabs.batch.udfs;

import ai.whylabs.core.utils.BinParser;
import ai.whylabs.druid.whylogs.metadata.BinMetadataEnforcer;
import java.io.ByteArrayOutputStream;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.api.java.UDF5;

/**
 * We didn't always add a referenceProfileId so for legacy reasons we enforce it before sending off
 * to druid to make sure all reference profiles have that tag populated.
 */
@Slf4j
public class PopulateReferenceProfileTag
    implements UDF5<byte[], String, String, Long, String, byte[]> {

  @Override
  public byte[] call(
      byte[] profileContent, String orgId, String datasetId, Long ts, String profileId)
      throws Exception {
    val profile = BinParser.parse(profileContent);
    if (profile == null) {
      // Corrupt file, skip
      log.warn(
          "Corrupt reference file could not be read likely due to corruption {}/{} {}",
          orgId,
          datasetId,
          profileId);
      return new byte[0];
    }

    val enforced =
        new BinMetadataEnforcer().enforce(profile, orgId, datasetId, ts, profileId, null);
    val bos = new ByteArrayOutputStream(profileContent.length);
    enforced.writeDelimitedTo(bos);
    return bos.toByteArray();
  }
}
