CREATE OR REPLACE FUNCTION regression_merge (sk1 bytea, sk2 bytea)
    RETURNS bytea
AS $$
    # import base64
    # from whylogs.core.proto.v0.v0_messages_pb2 import RegressionMetricsMessage
    # from whylogs.core.model_performance_metrics.regression_metrics import RegressionMetrics


    if GD.get("wl") is None:
        import whylogs as _wl
        GD["wl"] = _wl
    wl = GD["wl"]
    if GD.get("base64") is None:
        import base64 as _base64
        GD["base64"] = _base64
    base64 = GD["base64"]
    RegressionMetricsMessage = wl.core.proto.v0.v0_messages_pb2.RegressionMetricsMessage
    RegressionMetrics = wl.core.model_performance_metrics.regression_metrics.RegressionMetrics

    if sk1 is None:
        return sk2
    elif sk2 is None:
        return sk1

    # converting the base64 code into ascii characters
    bytes = base64.b64decode(sk1)
    msg = RegressionMetricsMessage()
    msg.ParseFromString(bytes)
    rm1 = RegressionMetrics.from_protobuf(msg)

    bytes = base64.b64decode(sk2)
    msg.ParseFromString(bytes)
    rm2 = RegressionMetrics.from_protobuf(msg)

    merged = rm1.merge(rm2)
    msg = merged.to_protobuf()
    return base64.b64encode(msg.SerializeToString())
$$ LANGUAGE plpython3u;

CREATE OR REPLACE AGGREGATE regression_merge (bytea)
    (
    sfunc = regression_merge,
    stype = bytea
    );

