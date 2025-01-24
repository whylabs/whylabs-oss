package ai.whylabs.dataservice.controllers;

import static org.junit.jupiter.api.Assertions.*;

import ai.whylabs.dataservice.util.SongbirdDynamoDumpReader;
import com.google.common.base.Preconditions;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.zip.GZIPInputStream;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Test;

@Slf4j
public class AsyncDeletionControllerTest {

  @SneakyThrows
  @Test
  public void testReadDump() {

    val classLoader = getClass().getClassLoader();
    try (val ios =
        classLoader.getResourceAsStream("songbird_dump/5uoqwlrrt432hgktpiker4icje.json.gz")) {
      Preconditions.checkNotNull(ios, "resource does not exist");
      GZIPInputStream gzip = new GZIPInputStream(ios);
      BufferedReader br = new BufferedReader(new InputStreamReader(gzip));
      String content = null;

      val i = new SongbirdDynamoDumpReader(br);
      boolean saworgZ7aTW2 = false;
      while (i.hasNext()) {
        val n = i.next();
        assertNotNull(n.getLeft());
        assertNotNull(n.getRight());

        if (n.getLeft().equals("org-0")) {
          assertNotEquals("model-0", n.getRight());
        }
        if (n.getLeft().equals("org-Z7aTW2")) {
          saworgZ7aTW2 = true;
        }
      }
      assertTrue(saworgZ7aTW2);
    }
  }
}
