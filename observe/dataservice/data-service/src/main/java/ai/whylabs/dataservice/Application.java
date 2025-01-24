package ai.whylabs.dataservice;

import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.AnalyzerRun;
import ai.whylabs.core.structures.Org;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.core.structures.monitor.events.AnalyzerResultResponse;
import ai.whylabs.dataservice.structures.BulkLoadAuditEntry;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micronaut.context.event.BeanCreatedEvent;
import io.micronaut.context.event.BeanCreatedEventListener;
import io.micronaut.core.annotation.Introspected;
import io.micronaut.runtime.Micronaut;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import javax.inject.Singleton;
import javax.persistence.Entity;
import org.joda.time.DateTimeZone;

@OpenAPIDefinition(info = @Info(title = "data-service", version = "0.0"))
@Introspected(
    packages = "ai.whylabs.core.structures",
    includedAnnotations = Entity.class,
    classes = {
      AnalyzerResult.class,
      AnalyzerRun.class,
      AnalyzerResultResponse.class,
      BulkLoadAuditEntry.class,
      MonitorConfigV3Row.class,
      Org.class
    })
public class Application {

  public static void main(String[] args) {
    DateTimeZone.setDefault(DateTimeZone.UTC);
    Micronaut.build(args).banner(false).packages("ai.whylabs").start();
  }

  @Singleton
  static class ObjectMapperBeanEventListener implements BeanCreatedEventListener<ObjectMapper> {
    /** Use the same object mapper we use all over the place in murmuration */
    @Override
    public ObjectMapper onCreated(BeanCreatedEvent<ObjectMapper> event) {
      final ObjectMapper mapper = event.getBean();
      MonitorConfigV3JsonSerde.configureMapper(mapper);
      return mapper;
    }
  }
}
