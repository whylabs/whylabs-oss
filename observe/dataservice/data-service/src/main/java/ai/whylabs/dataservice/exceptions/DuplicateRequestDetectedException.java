package ai.whylabs.dataservice.exceptions;

import lombok.experimental.StandardException;

@StandardException
public class DuplicateRequestDetectedException extends IllegalArgumentException {}
