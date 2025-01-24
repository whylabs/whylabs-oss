package ai.whylabs.dataservice.exceptions;

import io.micronaut.context.annotation.Requires;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import java.sql.SQLException;
import java.sql.SQLNonTransientConnectionException;
import java.sql.SQLSyntaxErrorException;
import java.sql.SQLTimeoutException;
import javax.inject.Singleton;
import lombok.extern.slf4j.Slf4j;

@Produces
@Singleton
@Requires(classes = {SQLException.class, ExceptionHandler.class})
@Slf4j
public class SQLExceptionHandler implements ExceptionHandler<SQLException, HttpResponse<?>> {

  @Override
  public HttpResponse<?> handle(HttpRequest request, SQLException exception) {
    String body = request.getBody().orElse("{}").toString();
    if (exception instanceof SQLTimeoutException) {
      log.warn("SQL timeout exception. Req: {}", body, exception);
      return HttpResponse.status(HttpStatus.REQUEST_TIMEOUT, exception.getMessage());
    }
    if (exception instanceof SQLSyntaxErrorException) {
      log.error("SQL syntax error. This is a bug! Req: {}", body, exception);
      return HttpResponse.status(HttpStatus.INTERNAL_SERVER_ERROR, exception.getMessage());
    }
    if (exception instanceof SQLNonTransientConnectionException) {
      log.error("Non-transient SQL connection exception", exception);
      return HttpResponse.status(HttpStatus.INTERNAL_SERVER_ERROR, exception.getMessage());
    }
    log.warn("Encountered SQL exception for request: {}", body, exception);
    return HttpResponse.status(HttpStatus.INTERNAL_SERVER_ERROR, exception.getMessage());
  }
}
