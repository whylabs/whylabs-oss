package ai.whylabs.dataservice.exceptions;

import io.micronaut.context.annotation.Requires;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import javax.inject.Singleton;
import javax.ws.rs.NotAcceptableException;

@Produces
@Singleton
@Requires(classes = {NotAcceptableException.class, ExceptionHandler.class})
public class NotAcceptableExceptionHandler
    implements ExceptionHandler<NotAcceptableException, HttpResponse> {

  @Override
  public HttpResponse<?> handle(HttpRequest request, NotAcceptableException exception) {
    return HttpResponse.status(HttpStatus.NOT_ACCEPTABLE, exception.getMessage());
  }
}
