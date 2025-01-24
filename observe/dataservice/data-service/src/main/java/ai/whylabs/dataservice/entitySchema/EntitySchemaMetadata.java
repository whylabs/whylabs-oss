package ai.whylabs.dataservice.entitySchema;

public interface EntitySchemaMetadata {
  DefaultSchemaMetadata getDefaultSchemaMetadata();

  DefaultSchemaMetadata getOverrideDefaultSchemaMetadata();

  void resetOverrideDefaultSchemaMetadata();

  String writeOverrideDefaultSchemaMetadata(DefaultSchemaMetadata defaultSchemaMetadata);
}
