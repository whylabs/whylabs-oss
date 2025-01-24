package ai.whylabs.dataservice.exceptions;

import io.micronaut.context.annotation.Requires;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import javax.inject.Singleton;
import lombok.extern.slf4j.Slf4j;

@Produces
@Singleton
@Requires(classes = {DowntimeWindowException.class, ExceptionHandler.class})
@Slf4j
public class DowntimeWindowExceptionHandler
    implements ExceptionHandler<DowntimeWindowException, HttpResponse<?>> {

  @Override
  public HttpResponse<?> handle(HttpRequest request, DowntimeWindowException exception) {
    return HttpResponse.status(HttpStatus.LOCKED, exception.getMessage());
  }
}
