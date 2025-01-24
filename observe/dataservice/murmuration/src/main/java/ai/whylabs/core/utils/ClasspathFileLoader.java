package ai.whylabs.core.utils;

import com.google.common.base.Preconditions;
import java.nio.charset.StandardCharsets;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.commons.io.IOUtils;

public class ClasspathFileLoader {

  @SneakyThrows
  public String getFileContents(String queryFile) {
    val classLoader = getClass().getClassLoader();
    try (val ios = classLoader.getResourceAsStream(queryFile)) {
      Preconditions.checkNotNull(ios, "%s resource does not exist", queryFile);
      return IOUtils.toString(ios, StandardCharsets.UTF_8);
    }
  }
}
