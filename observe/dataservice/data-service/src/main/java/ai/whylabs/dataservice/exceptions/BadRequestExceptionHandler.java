package ai.whylabs.dataservice.exceptions;

import io.micronaut.context.annotation.Requires;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import javax.inject.Singleton;
import javax.ws.rs.BadRequestException;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Produces
@Singleton
@Requires(classes = {BadRequestException.class, ExceptionHandler.class})
public class BadRequestExceptionHandler
    implements ExceptionHandler<BadRequestException, HttpResponse<?>> {

  @Override
  public HttpResponse<?> handle(HttpRequest request, BadRequestException exception) {
    return HttpResponse.status(HttpStatus.BAD_REQUEST, exception.getMessage());
  }
}
