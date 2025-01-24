package ai.whylabs.core.collectors;

import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import com.fasterxml.jackson.core.type.TypeReference;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.*;
import lombok.SneakyThrows;
import lombok.val;

/**
 * Fun story, joining monitor config to profile data breaks down at a certain scale because entity
 * schemas and configs can actually get pretty huge. Billions of copies from a broadcast join bogs
 * down spark.
 *
 * <p>So what we do instead is sink the latest configs to S3 before the job gets revved up, then
 * each spark task can read the configs into this little in-memory repo for super fast access. This
 * pretty much becomes a side-chain join that avoids too many copies of monitor config.
 */
public class MonitorConfigInMemoryRepo {
  Map<String, Map<String, MonitorConfigV3>> cache = new HashMap<>();

  public MonitorConfigInMemoryRepo() {}

  @SneakyThrows
  public MonitorConfigInMemoryRepo(byte[] compressed) {
    val json = new String(decompress(compressed));

    TypeReference<Map<String, Map<String, MonitorConfigV3>>> typeRef =
        new TypeReference<Map<String, Map<String, MonitorConfigV3>>>() {};
    cache = MonitorConfigV3JsonSerde.MAPPER.get().readValue(json, typeRef);
  }

  public void add(MonitorConfigV3Row row) {
    MonitorConfigV3 conf = MonitorConfigV3JsonSerde.parseMonitorConfigV3(row);
    add(conf);
  }

  public void add(MonitorConfigV3 conf) {
    if (conf.getAnalyzers() == null) {
      return;
    }
    clearUnusedFields(conf);
    if (!cache.containsKey(conf.getOrgId())) {
      cache.put(conf.getOrgId(), new HashMap<>());
    }
    cache.get(conf.getOrgId()).put(conf.getDatasetId(), conf);
  }

  public MonitorConfigV3 get(String orgId, String datasetId) {
    val confs = cache.get(orgId);
    if (confs == null) {
      return null;
    }
    return confs.get(datasetId);
  }

  public List<MonitorConfigV3> getAll() {
    List<MonitorConfigV3> all = new ArrayList<>();
    for (val m : cache.values()) {
      for (val mc : m.values()) {
        all.add(mc);
      }
    }
    return all;
  }

  /**
   * Configs are bulky and we don't need everything populated for monitor purposes. Trim the fat.
   */
  public void clearUnusedFields(MonitorConfigV3 conf) {
    for (val a : conf.getAnalyzers()) {
      a.setMetadata(null);
      a.setVersion(null);
    }
    if (conf.getMonitors() != null) {
      for (val m : conf.getMonitors()) {
        m.setActions(null);
        m.setDisplayName(null);
      }
    }

    conf.setMetadata(null);
  }

  @SneakyThrows
  public byte[] toBytes() {
    String json = MonitorConfigV3JsonSerde.MAPPER.get().writeValueAsString(cache);
    byte[] contentBytes = json.getBytes(StandardCharsets.UTF_8);
    return compress(contentBytes);
  }

  public static byte[] compress(byte[] data) throws IOException {
    Deflater deflater = new Deflater();
    deflater.setInput(data);

    ByteArrayOutputStream outputStream = new ByteArrayOutputStream(data.length);

    deflater.finish();
    byte[] buffer = new byte[1024];
    while (!deflater.finished()) {
      int count = deflater.deflate(buffer); // returns the generated code... index
      outputStream.write(buffer, 0, count);
    }
    outputStream.close();
    byte[] output = outputStream.toByteArray();

    return output;
  }

  public static byte[] decompress(byte[] data) throws IOException, DataFormatException {
    Inflater inflater = new Inflater();
    inflater.setInput(data);

    ByteArrayOutputStream outputStream = new ByteArrayOutputStream(data.length);
    byte[] buffer = new byte[1024];
    while (!inflater.finished()) {
      int count = inflater.inflate(buffer);
      outputStream.write(buffer, 0, count);
    }
    outputStream.close();
    byte[] output = outputStream.toByteArray();
    return output;
  }
}
