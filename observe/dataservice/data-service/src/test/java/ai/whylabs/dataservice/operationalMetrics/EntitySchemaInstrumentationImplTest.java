package ai.whylabs.dataservice.operationalMetrics;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import ai.whylabs.core.configV3.structure.EntitySchema;
import ai.whylabs.core.enums.ModelType;
import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.DataSvcConfig;
import ai.whylabs.dataservice.services.EntitySchemaService;
import ai.whylabs.druid.whylogs.metadata.BinMetadata;
import ai.whylabs.ingestion.V1Metadata;
import com.whylogs.core.message.ColumnMessage;
import com.whylogs.v0.core.message.DatasetPropertiesV0;
import io.micrometer.core.instrument.MeterRegistry;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import java.time.ZonedDateTime;
import lombok.val;
import org.junit.jupiter.api.Test;

@MicronautTest()
public class EntitySchemaInstrumentationImplTest extends BasePostgresTest {

  @Inject private EntitySchemaService entitySchemaService;
  @Inject private DataSvcConfig config;
  @Inject private MeterRegistry meterRegistry;

  @Test
  void testDefaultLlmMetadata() {
    val currentTime = ZonedDateTime.parse("2021-09-17T00:00:00Z");
    BinMetadata binMetadata =
        new BinMetadata("org-0", "model-0", currentTime.toInstant().toEpochMilli(), null, null);
    DatasetPropertiesV0 v0properties = DatasetPropertiesV0.newBuilder().build();
    V1Metadata metadata = new V1Metadata(v0properties, binMetadata);

    val schemaMetadata = entitySchemaService.getDefaultSchemaMetadata();
    EntitySchemaInstrumentationImpl schemaInference =
        new EntitySchemaInstrumentationImpl(metadata, schemaMetadata, config, meterRegistry);

    // add a generic column and test the inferred model type.
    // no model type expected b/c this column name is not specific to a model type.
    schemaInference.accummulateSchema("col1", ColumnMessage.newBuilder().build());
    EntitySchema entitySchema = schemaInference.getEntitySchema();
    assertThat(entitySchema.getModelType(), nullValue());
    assertThat(entitySchema.getColumns().get("col1").getTags(), nullValue());

    // add an llm column. Can use any of the column names that appear in
    // `default-schema-metadata.json`
    schemaInference.accummulateSchema("prompt.sentiment_nltk", ColumnMessage.newBuilder().build());
    entitySchema = schemaInference.getEntitySchema();
    assertThat(entitySchema.getModelType(), is(ModelType.llm));
    assertThat(
        entitySchema.getColumns().get("prompt.sentiment_nltk").getTags(),
        hasItems("sentiment", "security"));

    // test DefaultSchemaMetadata aliases
    schemaMetadata.metadata.get("llm").aliases.put("xyzzy", "prompt.sentiment_nltk");
    schemaInference =
        new EntitySchemaInstrumentationImpl(metadata, schemaMetadata, config, meterRegistry);
    schemaInference.accummulateSchema("xyzzy", ColumnMessage.newBuilder().build());
    entitySchema = schemaInference.getEntitySchema();
    // assert that xyzzy column got the same entity tags as "prompt.sentiment_nltk"
    assertThat(entitySchema.getColumns().get("xyzzy").getTags(), hasItems("sentiment", "security"));
  }
}
