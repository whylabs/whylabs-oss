package ai.whylabs.dataservice.exceptions;

import io.micronaut.context.annotation.Requires;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import javax.inject.Singleton;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Produces
@Singleton
@Requires(classes = {IllegalArgumentException.class, ExceptionHandler.class})
public class IllegalArgumentHandler
    implements ExceptionHandler<IllegalArgumentException, HttpResponse<?>> {

  @Override
  public HttpResponse<?> handle(HttpRequest request, IllegalArgumentException exception) {
    if (exception instanceof DuplicateRequestDetectedException) {
      return HttpResponse.status(HttpStatus.CONFLICT, exception.getMessage());
    }
    return HttpResponse.status(HttpStatus.BAD_REQUEST, exception.getMessage());
  }
}
