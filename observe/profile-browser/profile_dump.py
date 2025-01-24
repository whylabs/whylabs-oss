from whylogs import DatasetProfileView
from whylogs.migration.converters import read_v0_to_view


if __name__ == "__main__":
    import sys

    path = sys.argv[1]

    # view = read_v0_to_view(path, allow_partial=True)
    view = DatasetProfileView.read(path)
    print(view.to_pandas())
