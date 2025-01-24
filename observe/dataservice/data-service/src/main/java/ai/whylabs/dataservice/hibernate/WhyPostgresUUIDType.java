package ai.whylabs.dataservice.hibernate;

import ai.whylabs.dataservice.util.PostgresUtil;
import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.UUID;
import lombok.SneakyThrows;
import org.apache.commons.lang.NotImplementedException;
import org.hibernate.type.AbstractSingleColumnStandardBasicType;
import org.hibernate.type.descriptor.ValueBinder;
import org.hibernate.type.descriptor.ValueExtractor;
import org.hibernate.type.descriptor.WrapperOptions;
import org.hibernate.type.descriptor.java.AbstractTypeDescriptor;
import org.hibernate.type.descriptor.java.BasicJavaDescriptor;
import org.hibernate.type.descriptor.java.ImmutableMutabilityPlan;
import org.hibernate.type.descriptor.java.JavaTypeDescriptor;
import org.hibernate.type.descriptor.java.StringTypeDescriptor;
import org.hibernate.type.descriptor.sql.BasicBinder;
import org.hibernate.type.descriptor.sql.BasicExtractor;
import org.hibernate.type.descriptor.sql.SqlTypeDescriptor;
import org.hibernate.type.spi.TypeConfiguration;

/** Based on org.hibernate.type.PostgresUUIDType */
public class WhyPostgresUUIDType extends AbstractSingleColumnStandardBasicType<String> {

  public static final WhyPostgresUUIDType INSTANCE = new WhyPostgresUUIDType();

  public WhyPostgresUUIDType() {
    super(WhyLabsUUIDSqlTypeDescriptor.INSTANCE, StringTypeDescriptor.INSTANCE);
  }

  public String getName() {
    return "whylabs-uuid";
  }

  public static class WhyLabsUUIDJavaDescriptor extends AbstractTypeDescriptor<String> {

    public static final WhyLabsUUIDJavaDescriptor INSTANCE = new WhyLabsUUIDJavaDescriptor();

    public WhyLabsUUIDJavaDescriptor() {
      super(String.class, ImmutableMutabilityPlan.INSTANCE);
    }

    @Override
    public String fromString(String string) {
      return string;
    }

    @SneakyThrows
    @Override
    public <X> X unwrap(String value, Class<X> type, WrapperOptions options) {
      if (value == null) {
        return null;
      }

      if (String.class.isAssignableFrom(type)) {
        return (X) PostgresUtil.toUUID(value);
      }
      throw unknownUnwrap(value.getClass());
    }

    @Override
    public <X> String wrap(X value, WrapperOptions options) {
      if (value == null) {
        return null;
      }

      if (value instanceof String) {
        return (String) value;
      } else if (value instanceof UUID) {
        return ((UUID) value).toString();
      }
      throw unknownWrap(value.getClass());
    }
  }

  public static class WhyLabsUUIDSqlTypeDescriptor implements SqlTypeDescriptor {

    public static final WhyLabsUUIDSqlTypeDescriptor INSTANCE = new WhyLabsUUIDSqlTypeDescriptor();

    public int getSqlType() {
      // ugh
      return Types.OTHER;
    }

    @Override
    public boolean canBeRemapped() {
      return true;
    }

    @Override
    @SuppressWarnings("unchecked")
    public BasicJavaDescriptor getJdbcRecommendedJavaTypeMapping(
        TypeConfiguration typeConfiguration) {
      return (BasicJavaDescriptor)
          typeConfiguration.getJavaTypeDescriptorRegistry().getDescriptor(UUID.class);
    }

    public <X> ValueBinder<X> getBinder(final JavaTypeDescriptor<X> javaTypeDescriptor) {
      return new BasicBinder<X>(javaTypeDescriptor, this) {
        @Override
        protected void doBind(PreparedStatement st, X value, int index, WrapperOptions options)
            throws SQLException {
          st.setObject(index, PostgresUtil.toUUID((String) value), getSqlType());
        }

        @Override
        protected void doBind(CallableStatement st, X value, String name, WrapperOptions options)
            throws SQLException {
          st.setObject(name, PostgresUtil.toUUID((String) value), getSqlType());
        }
      };
    }

    public <X> ValueExtractor<X> getExtractor(final JavaTypeDescriptor<X> javaTypeDescriptor) {
      return new BasicExtractor<X>(javaTypeDescriptor, this) {
        @Override
        protected X doExtract(ResultSet rs, String name, WrapperOptions options)
            throws SQLException {
          // Gets called when reading a UUID back from entity manager
          return javaTypeDescriptor.wrap(rs.getObject(name).toString(), options);
        }

        @Override
        protected X doExtract(CallableStatement statement, int index, WrapperOptions options)
            throws SQLException {
          //          return javaTypeDescriptor.wrap( statement.getObject( index ), options );
          throw new NotImplementedException("Figure out what this does?");
        }

        @Override
        protected X doExtract(CallableStatement statement, String name, WrapperOptions options)
            throws SQLException {
          //          return javaTypeDescriptor.wrap( statement.getObject( name ), options );
          throw new NotImplementedException("Figure out what this does?");
        }
      };
    }
  }
}
