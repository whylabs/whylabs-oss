package ai.whylabs.dataservice.util;

import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;
import java.sql.SQLException;
import javax.sql.DataSource;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.postgresql.PGConnection;
import org.postgresql.copy.CopyManager;

@Slf4j
public class IngestionUtil {

  /**
   * Bulk import rows via the PGConnection Copy command.
   *
   * @param dataSource Datasource to import to
   * @param rows CSV formatted rows to import
   * @throws SQLException for SQLy problems
   * @throws IOException for IOy problems
   */
  public static void importViaCopyManager(DataSource dataSource, String rows)
      throws SQLException, IOException {

    val tempTableName = "whylogs_analyzer_results_temp_ingest_" + System.currentTimeMillis();

    val importSQL =
        "INSERT INTO whylabs.whylogs_analyzer_results\n"
            + "SELECT r.*\n"
            + "FROM "
            + tempTableName
            + " t\n"
            + "CROSS JOIN LATERAL\n"
            + "  jsonb_populate_record(NULL::whylabs.whylogs_analyzer_results, t.doc || jsonb_build_object('analyser_result_id', nextval('whylabs.whylogs_analyzer_results_analyser_result_id_seq'::regclass))) AS r;";

    long startTime = System.currentTimeMillis();
    try (val con = dataSource.getConnection();
        val st = con.createStatement();
        Reader reader = new StringReader(rows)) {
      con.setAutoCommit(false);
      st.execute("set statement_timeout to 36000000");
      st.execute("CREATE TEMPORARY TABLE " + tempTableName + " ( doc jsonb )");
      CopyManager copyManager = con.unwrap(PGConnection.class).getCopyAPI();
      copyManager.copyIn(
          "COPY " + tempTableName + "(doc) FROM STDIN csv QUOTE e'\\x01' DELIMITER e'\\x02'",
          reader);
      st.execute(importSQL);

      con.commit();
    }
    long durationMillis = System.currentTimeMillis() - startTime;
    long rowCount = rows.chars().filter(c -> c == '\n').count() + 1;

    log.info("Imported {} rows in {} ms.", rowCount, durationMillis);
  }
}
