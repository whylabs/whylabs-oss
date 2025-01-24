package ai.whylabs.dataservice;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Map;
import lombok.Builder;
import lombok.Data;
import lombok.SneakyThrows;

@Data
@Builder
public class Variance implements java.sql.Array {

  private Long count;
  private Double sum; // sample variance * (n-1)
  private Double mean;

  @SneakyThrows
  @Override
  public String toString() {
    return String.format("{ \"%d\", \"%f\", \"%f\" }", count, sum, mean);
  }

  @Override
  public String getBaseTypeName() throws SQLException {
    return "decimal";
  }

  @Override
  public int getBaseType() throws SQLException {
    return java.sql.Types.DECIMAL;
  }

  @Override
  public double[] getArray() throws SQLException {
    throw new UnsupportedOperationException();
  }

  @Override
  public Object getArray(Map<String, Class<?>> map) throws SQLException {
    throw new UnsupportedOperationException();
  }

  @Override
  public Object getArray(long index, int count) throws SQLException {
    throw new UnsupportedOperationException();
  }

  @Override
  public Object getArray(long index, int count, Map<String, Class<?>> map) throws SQLException {
    throw new UnsupportedOperationException();
  }

  @Override
  public ResultSet getResultSet() throws SQLException {
    throw new UnsupportedOperationException();
  }

  @Override
  public ResultSet getResultSet(Map<String, Class<?>> map) throws SQLException {
    throw new UnsupportedOperationException();
  }

  @Override
  public ResultSet getResultSet(long index, int count) throws SQLException {
    throw new UnsupportedOperationException();
  }

  @Override
  public ResultSet getResultSet(long index, int count, Map<String, Class<?>> map)
      throws SQLException {
    throw new UnsupportedOperationException();
  }

  @Override
  public void free() throws SQLException {}
}
