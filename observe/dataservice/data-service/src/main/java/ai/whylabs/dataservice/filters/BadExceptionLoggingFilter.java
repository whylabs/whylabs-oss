package ai.whylabs.dataservice.filters;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.MutableHttpResponse;
import io.micronaut.http.annotation.Filter;
import io.micronaut.http.filter.HttpServerFilter;
import io.micronaut.http.filter.ServerFilterChain;
import io.micronaut.http.hateoas.JsonError;
import java.util.ArrayList;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.logging.log4j.CloseableThreadContext;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Flux;

/**
 * Dataservice is only called internally so the only times we get bad requests or internal error is
 * when we have bugs in our code. This logging filter will capture such cases and enable better
 * visibility.
 */
@Slf4j
@Filter("/**")
public class BadExceptionLoggingFilter implements HttpServerFilter {
  @Override
  public Publisher<MutableHttpResponse<?>> doFilter(
      HttpRequest<?> request, ServerFilterChain chain) {
    return Flux.from(chain.proceed(request))
        .doOnEach(
            signal -> {
              if (signal.isOnNext()) {
                MutableHttpResponse<?> response = signal.get();
                if (response != null) {
                  int responseCode = response.getStatus().getCode();
                  if (responseCode >= 400 && responseCode != 404) {

                    try (val ctc =
                        CloseableThreadContext.put("responseCode", String.valueOf(responseCode))) {
                      ctc.put("headers", request.getHeaders().asMap().toString());
                      ctc.put("request", request.getBody(String.class).orElse(null));
                      ctc.put("path", request.getPath());
                      val body = response.body();
                      Consumer<String> logFn = (responseCode < 500) ? log::warn : log::error;
                      if (body instanceof JsonError) {
                        val errs =
                            ((JsonError) body)
                                .getEmbedded()
                                .get("errors")
                                .orElse(new ArrayList<>());
                        val errMsg =
                            errs.stream().map(e -> e.toString()).collect(Collectors.joining());
                        logFn.accept("Bad request detected - " + errMsg);
                      } else {
                        logFn.accept("Bad request detected");
                      }
                    }
                  }
                }
              }
            });
  }
}
