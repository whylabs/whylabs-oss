package ai.whylabs.dataservice.util;

import java.sql.SQLException;
import org.hibernate.query.internal.NativeQueryImpl;
import org.postgresql.util.PGobject;

public class PostgresUtil {
  private static final String UUID_CONST = "uuid";

  /**
   * We pass around UUIDs as strings and postgres jdbc likes a little casting on that for UUID typed
   * columns https://stackoverflow.com/questions/17969431/postgres-uuid-jdbc-not-working
   *
   * @param uuid
   * @return
   * @throws SQLException
   */
  public static PGobject toUUID(String uuid) throws SQLException {
    PGobject o = new PGobject();
    o.setType(UUID_CONST);
    o.setValue(uuid);
    return o;
  }

  /**
   * Apply a query timeout to a specific query
   *
   * @param query
   */
  public static void setStandardTimeout(NativeQueryImpl query) {
    query.setHint("javax.persistence.query.timeout", 60 * 1000);
  }

  public static void setLongTimeout(NativeQueryImpl query) {
    query.setHint("javax.persistence.query.timeout", 60 * 1000 * 30);
  }
}
