package ai.whylabs.dataservice.entitySchema;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.DataSvcConfig;
import com.google.gson.Gson;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

@Slf4j
class EntitySchemaMetadataImplTest extends BasePostgresTest {
  private static final Gson GSON = new Gson();
  private final DataSvcConfig config = new DataSvcConfig();
  private final EntitySchemaMetadataImpl entitySchemaMetadata =
      new EntitySchemaMetadataImpl(config);

  @BeforeEach
  void setUp() {
    config.setSongbirdBucket("development-songbird-20201028054020481800000001");
    entitySchemaMetadata.overridePath = "schema-metadata/default-schema-metadata.json";
  }

  @Test
  void testGetDefaultSchemaMetadata() {
    assertDoesNotThrow(entitySchemaMetadata::getDefaultSchemaMetadata);
  }

  @Test
  void testDefaultLlmMetadata() {
    DefaultMetadata llmMetadata =
        entitySchemaMetadata.getDefaultSchemaMetadata().metadata.get("llm");
    assertThat(llmMetadata.columnMetadata.length, greaterThan(0));
  }

  // These tests dont run in the pipeline because they need s3 credentials. I've left them here so
  // they
  // can be uncommented and used for debug locally.
  // @Test
  void testGetOverrideSchemaMetadata() {
    assertDoesNotThrow(entitySchemaMetadata::getOverrideDefaultSchemaMetadata);
  }

  // @Test
  void testNonExistentOverride() {
    entitySchemaMetadata.overridePath = "/does-not-exist.json";
    DefaultSchemaMetadata metadata = entitySchemaMetadata.getOverrideDefaultSchemaMetadata();
    assertThat(metadata, is(nullValue()));
  }

  // @Test
  void testCreateResetOverride() {
    entitySchemaMetadata.overridePath = "/test-override-metadata.json";
    entitySchemaMetadata.resetOverrideDefaultSchemaMetadata();
    assertThat(entitySchemaMetadata.getOverrideDefaultSchemaMetadata(), is(nullValue()));
    DefaultSchemaMetadata defaultSchemaMetadata = entitySchemaMetadata.getDefaultSchemaMetadata();
    entitySchemaMetadata.writeOverrideDefaultSchemaMetadata(defaultSchemaMetadata);
    DefaultSchemaMetadata overrideDefaultSchemaMetadata =
        entitySchemaMetadata.getOverrideDefaultSchemaMetadata();
    assertThat(
        GSON.toJson(overrideDefaultSchemaMetadata), equalTo(GSON.toJson(defaultSchemaMetadata)));
  }
}
