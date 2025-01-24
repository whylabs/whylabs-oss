package ai.whylabs.core.utils;

import java.io.Serializable;
import java.sql.Array;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import org.hibernate.HibernateException;
import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.usertype.ParameterizedType;
import org.hibernate.usertype.UserType;

/**
 * Fork https://github.com/karakays/hibernate-enum-array
 *
 * <p>Translate from List<FailureType> to a postgres text[]. Usually try to put enums in postgres,
 * but not for rapidly evolving enums like FailureType.
 */
public class PostgresEnumArrayType implements UserType, ParameterizedType {
  private final int[] arrayTypes = new int[] {Types.ARRAY};

  private Class<Enum<?>> mappedClass;

  protected void setMappedClass(Class<Enum<?>> mappedClass) {
    this.mappedClass = mappedClass;
  }

  protected Class<Enum<?>> getMappedClass() {
    return mappedClass;
  }

  public int[] sqlTypes() {
    return arrayTypes;
  }

  public Class<List> returnedClass() {
    return List.class;
  }

  public boolean equals(Object x, Object y) throws HibernateException {
    return x == null ? y == null : x.equals(y);
  }

  public int hashCode(Object x) throws HibernateException {
    return x == null ? 0 : x.hashCode();
  }

  public Object deepCopy(Object value) throws HibernateException {
    if (value == null) {
      return null;
    }

    List<Enum<?>> list = (List<Enum<?>>) value;
    ArrayList<Enum<?>> clone = new ArrayList<Enum<?>>();
    for (Enum<?> intOn : list) {
      clone.add(intOn);
    }

    return clone;
  }

  public boolean isMutable() {
    return false;
  }

  public Serializable disassemble(Object value) throws HibernateException {
    return (Serializable) value;
  }

  public Object assemble(Serializable cached, Object owner) throws HibernateException {
    return cached;
  }

  public Object replace(Object original, Object target, Object owner) throws HibernateException {
    return original;
  }

  public Object nullSafeGet(
      ResultSet rs, String[] names, SharedSessionContractImplementor session, Object owner)
      throws HibernateException, SQLException {
    if (names != null && names.length > 0 && rs != null && rs.getArray(names[0]) != null) {
      String[] array = (String[]) rs.getArray(names[0]).getArray();

      List<Enum<?>> enumList = new ArrayList<>();

      for (String s : array) {
        enumList.add(Enum.valueOf((Class) mappedClass, s));
      }
      return enumList;
    }
    return null;
  }

  public void nullSafeSet(
      PreparedStatement st, Object value, int index, SharedSessionContractImplementor session)
      throws HibernateException, SQLException {
    if (value != null && st != null) {
      List<Enum<?>> list = (List<Enum<?>>) value;
      String[] castObject = (String[]) list.stream().map(e -> e.name()).toArray(String[]::new);
      Array array = session.connection().createArrayOf("text", castObject);
      st.setArray(index, array);
    } else {
      st.setNull(index, arrayTypes[0]);
    }
  }

  public void setParameterValues(Properties parameters) {
    if (parameters.containsKey("enumClass")) {
      String enumClassName = parameters.getProperty("enumClass");
      try {
        setMappedClass((Class<Enum<?>>) Class.forName(enumClassName));
      } catch (ClassNotFoundException e) {
        throw new HibernateException("Specified enum class could not be found", e);
      }
    }
  }
}
