package ai.whylabs.dataservice.tokens;

import ai.whylabs.dataservice.requests.ProfileRollupRequest;

public interface RetrievalToken {
  void apply(ProfileRollupRequest req);

  int getVersion();
}
