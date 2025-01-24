package ai.whylabs.dataservice.tokens;

import ai.whylabs.dataservice.requests.ProfileRollupRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.inject.Inject;
import javax.inject.Singleton;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.StringUtils;

@Singleton
@RequiredArgsConstructor
@Slf4j
public class RetrievalTokenService {

  @Inject private ObjectMapper mapper;

  @SneakyThrows
  public String toString(RetrievalToken token) {
    String json = mapper.writeValueAsString(token);
    return Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));
  }

  @SneakyThrows
  public RetrievalToken fromString(String s) {
    val json = new String(Base64.getDecoder().decode(s), StandardCharsets.UTF_8);
    // TODO: When implementing V2 you'll need to check the version number from json to figure out
    // which class to deserialize
    return mapper.readValue(json, RetrievalTokenV1.class);
  }

  public void apply(ProfileRollupRequest request) {
    if (StringUtils.isEmpty(request.getRetrievalToken())) {
      return;
    }
    RetrievalToken token = fromString(request.getRetrievalToken());
    token.apply(request);
  }
}
