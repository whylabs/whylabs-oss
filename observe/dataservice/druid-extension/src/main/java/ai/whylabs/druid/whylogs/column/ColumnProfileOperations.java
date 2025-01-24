/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package ai.whylabs.druid.whylogs.column;

import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import com.whylogs.core.ColumnProfile;
import com.whylogs.v0.core.message.ColumnMessageV0;
import java.nio.charset.StandardCharsets;
import javax.annotation.Nonnull;
import org.apache.druid.java.util.common.ISE;

public class ColumnProfileOperations {

  public static final ColumnProfile EMPTY_COLUMN = new ColumnProfile("");

  public static ColumnProfile deserialize(final Object columnProfile) {
    if (columnProfile instanceof String) {
      return deserializeFromBase64EncodedString((String) columnProfile);
    } else if (columnProfile instanceof byte[]) {
      return deserializeFromByteArray((byte[]) columnProfile);
    } else if (columnProfile instanceof ColumnProfile) {
      return (ColumnProfile) columnProfile;
    }
    throw new ISE(
        "Object is not of a type that can be deserialized to a quantiles ColumnProfile: "
            + columnProfile.getClass());
  }

  public static ColumnProfile deserializeFromBase64EncodedString(final String str) {
    return deserializeFromByteArray(
        DruidStringUtils.decodeBase64(str.getBytes(StandardCharsets.UTF_8)));
  }

  @Nonnull
  private static ColumnProfile deserializeFromByteArray(byte[] bytes) {
    try {
      return ColumnProfile.fromProtobuf(ColumnMessageV0.parseFrom(bytes));
    } catch (InvalidProtocolBufferException e) {
      throw new RuntimeException(e);
    }
  }
}
