package ai.whylabs.ingestion;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.notNullValue;

import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import com.whylogs.core.message.ColumnMessage;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import java.io.BufferedInputStream;
import java.io.IOException;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.druid.java.util.common.io.Closer;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;

public class V0ColumnsIteratorTest {
  private static final int MARK_READ_LIMIT = 128;
  Closer closer;

  @Before
  public void createCloser() {
    closer = Closer.create();
  }

  @After
  public void cleanup() throws IOException {
    closer.close();
  }

  @SneakyThrows
  @Test
  public void TestConversion() {
    val is =
        getClass()
            .getResourceAsStream(
                "/reference-profiles/2021-05-28/org-0-model-0-3OAzVit8a521yyCppfaP2ZEHcZtWwcWR.bin");
    assertThat(is, notNullValue());
    closer.register(is);

    val bis = new BufferedInputStream(is);
    DatasetProfileMessage msg;

    try {
      bis.mark(MARK_READ_LIMIT);
      msg = DatasetProfileMessage.parseDelimitedFrom(bis);
      /* This improvement is trickier than expected, commenting out until there's cycles to
      work on hardening this when reading a binpacked delimited file

      if (!validateDelimitedProtoDeserializationPredicate.test(msg)) {
        bis.reset();
        msg = DatasetProfileMessage.parseFrom(bis);
      }*/
    } catch (InvalidProtocolBufferException pe) {
      bis.reset();
      msg = DatasetProfileMessage.parseFrom(bis);
    }
    assertThat(msg, notNullValue());

    val it = new V0toV1ColumnsIterator(msg.getColumnsMap());

    int c = 0;
    while (it.hasNext()) {
      Pair<String, ColumnMessage> n = it.next();
      c++;
    }
  }
}
