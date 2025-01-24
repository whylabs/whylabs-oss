package ai.whylabs.dataservice.util;

import com.vladmihalcea.hibernate.type.array.StringArrayType;
import org.hibernate.dialect.PostgreSQL94Dialect;

/**
 * Gets referenced by hibernate config. Allows you to register custom type handlers from the
 * hibernate types library.
 */
public class PostgreSQL94CustomDialect extends PostgreSQL94Dialect {

  public PostgreSQL94CustomDialect() {
    super();
    this.registerHibernateType(2003, StringArrayType.class.getName());
  }
}
