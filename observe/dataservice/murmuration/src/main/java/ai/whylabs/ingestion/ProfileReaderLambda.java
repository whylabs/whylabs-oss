package ai.whylabs.ingestion;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestStreamHandler;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;

/**
 * Read an individual profile, enforce metadata, produce V1 chunked content onto kinesis, and
 * generate operational metrics.
 */
@Setter
@Builder
@AllArgsConstructor
@Slf4j
@Deprecated
public class ProfileReaderLambda implements RequestStreamHandler {

  @Override
  public void handleRequest(InputStream input, OutputStream output, Context context)
      throws IOException {
    // TODO: Remove this class once the infra invoking it has been ripped out
  }
}
