from datetime import datetime
from typing import Any, List, Optional, Tuple

import pandas as pd
import plotly.graph_objects as go


def plot_time_series(data: List[Tuple[datetime, Any]], title: str = "Time Series Plot", y_axis_label: str = "Value") -> go.Figure:
    """
    Create a plotly time series plot from a list of (timestamp, value) tuples

    Parameters:
    -----------
    data : List[Tuple[int, float]]
        List of tuples where first element is epoch timestamp in milliseconds
        and second element is the value to plot
    title : str
        Title for the plot
    y_axis_label : str
        Label for the y-axis

    Returns:
    --------
    plotly.graph_objects.Figure
        Interactive plotly figure
    """
    # Unzip the tuples into separate lists
    timestamps, values = zip(*data)

    # Convert epoch timestamps to datetime objects
    dates = [ts for ts in timestamps]

    # Create the figure
    fig = go.Figure()

    # Add the line trace
    fig.add_trace(go.Scatter(x=dates, y=values, mode="lines+markers", name=y_axis_label, line=dict(width=2), marker=dict(size=6)))

    # Update layout
    fig.update_layout(
        title=title,
        xaxis_title="Time",
        yaxis_title=y_axis_label,
        hovermode="x unified",
        template="plotly_dark",
        showlegend=False,
    )

    # Configure hover text
    # fig.update_traces(hovertemplate="<br>".join(["Time: %{x}", f"{y_axis_label}: %{values:.2f}", "<extra></extra>"]))

    return fig


def plot_time_series_df(
    df: pd.DataFrame, title="Line Plot", x_column: str = "timestamp", x_label: Optional[str] = None, y_label: Optional[str] = None
):
    """
    Create a plotly line plot from a DataFrame where first column is x-axis
    and remaining columns are separate lines.

    Args:
        df: pandas DataFrame where first column is x values and rest are y values
        title: Title for the plot (default: "Line Plot")
        x_label: Label for x-axis (default: name of first column)
        y_label: Label for y-axis (default: "Value")

    Returns:
        None (displays the plot)
    """
    # Use the first column

    # Create figure
    fig = go.Figure()

    # Add a trace for each y column
    # get everything besides the x columns by dropping the x column
    y_columns = df.drop(columns=[x_column]).columns
    for column in y_columns:
        fig.add_trace(
            go.Scatter(
                x=df[x_column],
                y=df[column],
                name=column,
                mode="lines",  # 'lines+markers' if you want points too
            )
        )

    # Update layout
    fig.update_layout(
        title=title,
        xaxis_title=x_label if x_label else x_column,
        yaxis_title=y_label if y_label else "Value",
        template="plotly_dark",
        hovermode="x unified",  # Shows all values for a given x
        showlegend=True,
    )

    return fig
