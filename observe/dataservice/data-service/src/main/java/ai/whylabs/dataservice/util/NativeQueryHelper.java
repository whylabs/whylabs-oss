package ai.whylabs.dataservice.util;

import com.google.common.collect.Lists;
import com.vladmihalcea.hibernate.type.array.StringArrayType;
import java.sql.Array;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import lombok.SneakyThrows;
import lombok.val;
import org.hibernate.query.internal.NativeQueryImpl;
import org.postgresql.jdbc.PgArray;

public class NativeQueryHelper {
  public static void populateRequiredStringListFilter(
      NativeQueryImpl q, List<String> list, String fieldname) {
    q.setParameter(fieldname, list == null ? Collections.emptyList() : list);
  }

  /** Populate optional query parameters when the underlying table column is text. */
  public static void populateOptionalStringListFilter(
      NativeQueryImpl query, List<String> list, String fieldname, String countFieldName) {
    query.setParameter(fieldname, list == null ? Collections.emptyList() : list);
    query.setParameter(countFieldName, list == null ? 0 : list.size());
  }

  /** Populate optional query parameters when the underlying table column is an array of text. */
  public static void populateMultivaluedOptionalStringListFilter(
      NativeQueryImpl query, List<String> list, String fieldname, String countFieldName) {
    query.setParameter(
        fieldname, list == null ? Collections.emptyList() : list, StringArrayType.INSTANCE);
    query.setParameter(countFieldName, list == null ? 0 : list.size());
  }

  @SneakyThrows
  public static Array toArray(Connection db, List<String> list) {
    if (list == null) {
      return db.createArrayOf("TEXT", new String[] {});
    }
    val a = list.toArray(new String[] {});
    return db.createArrayOf("TEXT", a);
  }

  public static List<String> fromArray(PgArray pgArray) throws SQLException {
    if (pgArray != null) {
      val ta = (String[]) pgArray.getArray();
      if (ta.length > 0) {
        return Lists.newArrayList(ta);
      }
    }
    return new ArrayList<>();
  }
}
