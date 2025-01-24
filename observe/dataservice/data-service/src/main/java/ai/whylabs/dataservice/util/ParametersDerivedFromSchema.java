package ai.whylabs.dataservice.util;

/**
 * Normally string concat in a sql query is a big no-no, but when the source of all params come from
 * information schema rather than user input, it's okay.
 */
public @interface ParametersDerivedFromSchema {}
