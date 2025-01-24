from langkit.metrics.themes.additional_data import parse_s3_path


def test_s3_path_parse():
    s3_path = "s3://anthony-test-bucket-2/data/embeddings.npy"
    result = parse_s3_path(s3_path)
    assert result.bucket == "anthony-test-bucket-2"
    assert result.key == "data/embeddings.npy"
