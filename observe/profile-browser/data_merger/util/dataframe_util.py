from datetime import datetime

import pandas as pd


def filter_by_date_range(df: pd.DataFrame, start_date: str, end_date: str) -> pd.DataFrame:
    """
    Filter dataframe by date range

    Parameters:
    -----------
    df : pd.DataFrame
        Dataframe containing 'timestamp' column in milliseconds
    start_date : str
        Start date in 'YYYY-MM-DD' format
    end_date : str
        End date in 'YYYY-MM-DD' format

    Returns:
    --------
    pd.DataFrame
        Filtered dataframe within the specified date range

    Raises:
    -------
    ValueError
        If dates are not in correct format or if timestamp column is missing
    """
    # Validate timestamp column exists
    if "timestamp" not in df.columns:
        raise ValueError("DataFrame must contain a 'timestamp' column")

    try:
        # Convert string dates to timestamps in milliseconds
        start_ts = int(datetime.strptime(start_date, "%Y-%m-%d").timestamp() * 1000)
        end_ts = int(datetime.strptime(end_date, "%Y-%m-%d").timestamp() * 1000)
    except ValueError as e:
        raise ValueError(f"Invalid date format. Dates must be in 'YYYY-MM-DD' format. Error: {str(e)}")

    # Filter dataframe
    mask = (df["timestamp"] >= start_ts) & (df["timestamp"] <= end_ts)
    return df[mask]


# Example usage:
# filtered_df = filter_by_date_range(df, '2024-01-01', '2024-12-31')
