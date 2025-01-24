package ai.whylabs.dataservice.util;

import ai.whylabs.core.utils.CamelSnakeConversion;
import com.vladmihalcea.hibernate.naming.CamelCaseToSnakeCaseNamingStrategy;
import org.hibernate.boot.model.naming.Identifier;
import org.hibernate.boot.model.naming.PhysicalNamingStrategyStandardImpl;
import org.hibernate.engine.jdbc.env.spi.JdbcEnvironment;

/**
 * We camel case fields in our POJOs and map them to snake cased columns in postgres. This class
 * bridges the gap so you don't have to put a column name annotation on every field in your pojo.
 */
public class CustomPhysicalNamingStrategy extends PhysicalNamingStrategyStandardImpl {
  public static final CamelCaseToSnakeCaseNamingStrategy INSTANCE =
      new CamelCaseToSnakeCaseNamingStrategy();

  @Override
  public Identifier toPhysicalCatalogName(Identifier name, JdbcEnvironment context) {
    return formatIdentifier(super.toPhysicalCatalogName(name, context));
  }

  @Override
  public Identifier toPhysicalSchemaName(Identifier name, JdbcEnvironment context) {
    return formatIdentifier(super.toPhysicalSchemaName(name, context));
  }

  @Override
  public Identifier toPhysicalTableName(Identifier name, JdbcEnvironment context) {
    return formatIdentifier(super.toPhysicalTableName(name, context));
  }

  @Override
  public Identifier toPhysicalSequenceName(Identifier name, JdbcEnvironment context) {
    return formatIdentifier(super.toPhysicalSequenceName(name, context));
  }

  @Override
  public Identifier toPhysicalColumnName(Identifier name, JdbcEnvironment context) {
    return formatIdentifier(super.toPhysicalColumnName(name, context));
  }

  private Identifier formatIdentifier(Identifier identifier) {
    if (identifier != null) {
      String name = identifier.getText();

      String formattedName = CamelSnakeConversion.toSnake(name);

      return !formattedName.equals(name)
          ? Identifier.toIdentifier(formattedName, identifier.isQuoted())
          : identifier;
    } else {
      return null;
    }
  }
}
