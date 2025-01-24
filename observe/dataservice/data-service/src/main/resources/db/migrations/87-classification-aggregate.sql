CREATE OR REPLACE FUNCTION classification_merge (sk1 bytea, sk2 bytea)
    RETURNS bytea
AS $$

    if GD.get("wl") is None:
        import whylogs as _wl
        GD["wl"] = _wl
    wl = GD["wl"]
    if GD.get("base64") is None:
        import base64 as _base64
        GD["base64"] = _base64
    base64 = GD["base64"]
    ScoreMatrixMessage = wl.core.proto.v0.v0_messages_pb2.ScoreMatrixMessage
    ConfusionMatrix = wl.core.model_performance_metrics.confusion_matrix.ConfusionMatrix

    if sk1 is None:
        return sk2
    elif sk2 is None:
        return sk1

    # converting the base64 code into ascii characters
    bytes = base64.b64decode(sk1)
    msg = ScoreMatrixMessage()
    msg.ParseFromString(bytes)
    cm1 = ConfusionMatrix.from_protobuf(msg)

    bytes = base64.b64decode(sk2)
    msg.ParseFromString(bytes)
    cm2 = ConfusionMatrix.from_protobuf(msg)

    merged = cm1.merge(cm2)
    msg = merged.to_protobuf()
    return base64.b64encode(msg.SerializeToString())
$$ LANGUAGE plpython3u;

CREATE OR REPLACE AGGREGATE classification_merge (bytea)
    (
    sfunc = classification_merge,
    stype = bytea
    );

