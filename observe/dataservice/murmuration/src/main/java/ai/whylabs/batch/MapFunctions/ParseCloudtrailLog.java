package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.serde.S3CloudtrailNotificationParser;
import ai.whylabs.core.structures.BinaryFileRow;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Iterator;
import java.util.List;
import java.util.zip.GZIPInputStream;
import lombok.SneakyThrows;
import org.apache.commons.io.IOUtils;
import org.apache.spark.api.java.function.FlatMapFunction;

public class ParseCloudtrailLog implements FlatMapFunction<BinaryFileRow, String> {

  private transient ObjectMapper MAPPER = new ObjectMapper();
  S3CloudtrailNotificationParser parser;

  public ParseCloudtrailLog(String orgId, String datasetId) {
    this.parser = new S3CloudtrailNotificationParser(orgId, datasetId);
  }

  @Override
  public Iterator<String> call(BinaryFileRow log) throws Exception {
    byte[] decompress = decompress(log.getContent());
    String json = new String(decompress);
    List<String> binFiles = parser.getS3Paths(json);
    return binFiles.iterator();
  }

  @SneakyThrows
  public static byte[] decompress(byte[] contentBytes) {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    IOUtils.copy(new GZIPInputStream(new ByteArrayInputStream(contentBytes)), out);
    return out.toByteArray();
  }
}
