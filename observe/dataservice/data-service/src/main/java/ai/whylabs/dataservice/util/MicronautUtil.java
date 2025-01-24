package ai.whylabs.dataservice.util;

import io.micronaut.core.io.Readable;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.stream.Collectors;
import org.jetbrains.annotations.NotNull;

public class MicronautUtil {

  // There's no way to inject the contents of a file on the resource classpath directly as a
  // variable.  The best one can do is to obtain a Readable, which must then be finagled into
  // a String.
  //  see: https://gitter.im/micronautfw/questions?at=6397d5dd865cc926ae5a4e09
  @NotNull
  public static String getStringFromReadable(Readable readable) throws IOException {
    return new BufferedReader(new InputStreamReader(readable.asInputStream()))
        .lines()
        .collect(Collectors.joining("\n"));
  }
}
