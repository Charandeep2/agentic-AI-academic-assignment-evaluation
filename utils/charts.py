"""
Chart utility functions using Plotly for the Academic Assessment System.
Provides reusable chart components for student and faculty dashboards.
"""
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd


def create_score_gauge(score, max_score=100, title="Overall Score"):
    """Create a gauge chart for displaying scores."""
    percentage = (score / max_score) * 100 if max_score > 0 else 0

    if percentage >= 90:
        color = "#2ecc71"
    elif percentage >= 75:
        color = "#3498db"
    elif percentage >= 60:
        color = "#f39c12"
    elif percentage >= 40:
        color = "#e67e22"
    else:
        color = "#e74c3c"

    fig = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=percentage,
        title={"text": title, "font": {"size": 16}},
        number={"suffix": "%", "font": {"size": 28}},
        gauge={
            "axis": {"range": [0, 100], "tickwidth": 1},
            "bar": {"color": color},
            "bgcolor": "white",
            "borderwidth": 2,
            "steps": [
                {"range": [0, 40], "color": "#fadbd8"},
                {"range": [40, 60], "color": "#fdebd0"},
                {"range": [60, 75], "color": "#d5f5e3"},
                {"range": [75, 90], "color": "#d4efdf"},
                {"range": [90, 100], "color": "#abebc6"},
            ],
            "threshold": {
                "line": {"color": "red", "width": 4},
                "thickness": 0.75,
                "value": percentage,
            },
        },
    ))
    fig.update_layout(height=250, margin=dict(l=20, r=20, t=40, b=20))
    return fig


def create_topic_radar(topic_scores, title="Topic Mastery"):
    """Create a radar/spider chart for topic-wise scores."""
    if not topic_scores:
        return None

    topics = list(topic_scores.keys())
    scores = list(topic_scores.values())

    # Close the radar chart
    topics_closed = topics + [topics[0]]
    scores_closed = scores + [scores[0]]

    fig = go.Figure()
    fig.add_trace(go.Scatterpolar(
        r=scores_closed,
        theta=topics_closed,
        fill='toself',
        name='Score',
        line_color='#3498db',
        fillcolor='rgba(52, 152, 219, 0.3)',
    ))
    fig.update_layout(
        polar=dict(
            radialaxis=dict(visible=True, range=[0, 100]),
        ),
        showlegend=False,
        title=title,
        height=350,
        margin=dict(l=60, r=60, t=40, b=40),
    )
    return fig


def create_performance_trend(dates, scores, title="Performance Trend"):
    """Create a line chart showing performance over time."""
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=dates,
        y=scores,
        mode='lines+markers',
        name='Score',
        line=dict(color='#3498db', width=3),
        marker=dict(size=10, color='#2980b9'),
        fill='tozeroy',
        fillcolor='rgba(52, 152, 219, 0.1)',
    ))
    fig.update_layout(
        title=title,
        xaxis_title="Date",
        yaxis_title="Score (%)",
        yaxis=dict(range=[0, 105]),
        height=300,
        margin=dict(l=40, r=20, t=40, b=40),
    )
    return fig


def create_grade_distribution(scores, title="Grade Distribution"):
    """Create a histogram of grade distribution."""
    grade_labels = []
    for s in scores:
        if s >= 90: grade_labels.append("A (90-100)")
        elif s >= 80: grade_labels.append("B (80-89)")
        elif s >= 70: grade_labels.append("C (70-79)")
        elif s >= 60: grade_labels.append("D (60-69)")
        else: grade_labels.append("F (<60)")

    df = pd.DataFrame({"Grade": grade_labels})
    grade_order = ["A (90-100)", "B (80-89)", "C (70-79)", "D (60-69)", "F (<60)"]
    colors = ["#2ecc71", "#3498db", "#f39c12", "#e67e22", "#e74c3c"]

    fig = px.histogram(
        df, x="Grade",
        category_orders={"Grade": grade_order},
        color="Grade",
        color_discrete_sequence=colors,
        title=title,
    )
    fig.update_layout(
        showlegend=False,
        height=300,
        margin=dict(l=40, r=20, t=40, b=40),
        yaxis_title="Number of Students",
    )
    return fig


def create_mastery_heatmap(students, topics, scores_matrix, title="Topic Mastery Heatmap"):
    """Create a heatmap of student vs topic mastery."""
    fig = go.Figure(data=go.Heatmap(
        z=scores_matrix,
        x=topics,
        y=students,
        colorscale='RdYlGn',
        zmin=0,
        zmax=100,
        text=[[f"{val:.0f}" for val in row] for row in scores_matrix],
        texttemplate="%{text}",
        textfont={"size": 11},
        hovertemplate="Student: %{y}<br>Topic: %{x}<br>Score: %{z:.1f}<extra></extra>",
    ))
    fig.update_layout(
        title=title,
        height=max(300, len(students) * 40 + 100),
        margin=dict(l=120, r=20, t=40, b=80),
        xaxis=dict(tickangle=-45),
    )
    return fig


def create_submission_status_pie(submitted, pending, overdue, title="Submission Status"):
    """Create a pie chart for submission completion status."""
    labels = ["Submitted", "Pending", "Overdue"]
    values = [submitted, pending, overdue]
    colors = ["#2ecc71", "#3498db", "#e74c3c"]

    # Filter out zero values
    filtered = [(l, v, c) for l, v, c in zip(labels, values, colors) if v > 0]
    if not filtered:
        return None

    labels, values, colors = zip(*filtered)

    fig = go.Figure(data=[go.Pie(
        labels=labels,
        values=values,
        marker_colors=colors,
        hole=0.4,
        textinfo='label+percent+value',
    )])
    fig.update_layout(
        title=title,
        height=300,
        margin=dict(l=20, r=20, t=40, b=20),
    )
    return fig


def create_comparison_bar(names, scores, title="Student Comparison", color="#3498db"):
    """Create a horizontal bar chart comparing students."""
    # Sort by score
    sorted_data = sorted(zip(names, scores), key=lambda x: x[1], reverse=True)
    names_sorted, scores_sorted = zip(*sorted_data) if sorted_data else ([], [])

    colors = []
    for s in scores_sorted:
        if s >= 90: colors.append("#2ecc71")
        elif s >= 75: colors.append("#3498db")
        elif s >= 60: colors.append("#f39c12")
        else: colors.append("#e74c3c")

    fig = go.Figure(go.Bar(
        x=list(scores_sorted),
        y=list(names_sorted),
        orientation='h',
        marker_color=colors,
        text=[f"{s:.1f}%" for s in scores_sorted],
        textposition='auto',
    ))
    fig.update_layout(
        title=title,
        xaxis_title="Score (%)",
        xaxis=dict(range=[0, 105]),
        height=max(250, len(names) * 35 + 80),
        margin=dict(l=120, r=20, t=40, b=40),
    )
    return fig


def get_mastery_color(level):
    """Get color for mastery level badge."""
    colors = {
        "expert": "#2ecc71",
        "advanced": "#3498db",
        "intermediate": "#f39c12",
        "beginner": "#e74c3c",
    }
    return colors.get(level.lower(), "#95a5a6")


def get_mastery_emoji(level):
    """Get emoji for mastery level."""
    emojis = {
        "expert": "🏆",
        "advanced": "⭐",
        "intermediate": "📈",
        "beginner": "🌱",
    }
    return emojis.get(level.lower(), "❓")
