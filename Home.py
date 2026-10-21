"""
🎓 AI Academic Assessment System - Home Page
Main entry point with authentication (login/register).
"""
import streamlit as st
import sys
sys.path.insert(0, '.')

# Page configuration - MUST be first Streamlit command
st.set_page_config(
    page_title="AI Academic Assessment",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded",
)

from database import init_db
from seed_data import seed_database
from auth import (
    init_streamlit_auth, authenticate_user, register_user,
    login_user, logout_user, get_current_user,
)

# Initialize database and seed data on first run
@st.cache_resource
def setup_database():
    init_db()
    seed_database()
    return True

setup_database()

# Initialize authentication
init_streamlit_auth(st)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        text-align: center;
        padding: 1rem 0;
    }
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1.5rem;
        border-radius: 10px;
        color: white;
        text-align: center;
        margin: 0.5rem 0;
    }
    .info-card {
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 10px;
        border-left: 4px solid #3498db;
        margin: 0.5rem 0;
    }
    .success-card {
        background: #d4edda;
        padding: 1rem;
        border-radius: 8px;
        border-left: 4px solid #28a745;
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 2rem;
    }
    .stTabs [data-baseweb="tab"] {
        padding: 10px 20px;
    }
</style>
""", unsafe_allow_html=True)


def show_sidebar():
    """Display sidebar with user info and navigation."""
    with st.sidebar:
        user = get_current_user(st)
        if user:
            st.markdown(f"### 👤 {user['full_name']}")
            role_emoji = "🎓" if user["role"] == "student" else "👨‍🏫"
            st.markdown(f"{role_emoji} **Role:** {user['role'].title()}")
            st.markdown(f"📧 {user['email']}")
            st.markdown(f"🏛️ {user['department']}")
            st.divider()

            st.markdown("### 📌 Navigation")
            if user["role"] == "student":
                st.markdown("- 🎓 **Student Portal** - Submit & track assignments")
                st.markdown("- 📊 **Analytics** - View your performance")
            else:
                st.markdown("- 👨‍🏫 **Faculty Portal** - Manage & evaluate")
                st.markdown("- 📊 **Analytics** - Class performance")

            st.divider()
            if st.button("🚪 Logout", use_container_width=True):
                logout_user(st)
                st.rerun()
        else:
            st.markdown("### 🎓 AI Assessment System")
            st.markdown("Please log in to continue.")
            st.divider()
            st.markdown("#### 🔑 Demo Accounts")
            st.markdown("**Faculty:**")
            st.code("dr.smith / faculty123")
            st.markdown("**Students:**")
            st.code("alice / student123\nbob / student123\ncharlie / student123")


def show_login_page():
    """Display the login/register page."""
    st.markdown(
        "<h1 class='main-header'>🎓 AI Academic Assessment System</h1>",
        unsafe_allow_html=True,
    )
    st.markdown(
        "<p style='text-align:center; font-size:1.2rem; color:#666;'>"
        "Intelligent Assessment & Performance Analytics powered by Agentic AI</p>",
        unsafe_allow_html=True,
    )

    st.divider()

    col1, col2, col3 = st.columns([1, 2, 1])

    with col2:
        tab1, tab2 = st.tabs(["🔐 Login", "📝 Register"])

        with tab1:
            st.markdown("#### Welcome Back!")
            with st.form("login_form"):
                username = st.text_input("Username", placeholder="Enter your username")
                password = st.text_input(
                    "Password", type="password", placeholder="Enter your password"
                )
                submit = st.form_submit_button("🔓 Login", use_container_width=True)

                if submit:
                    if not username or not password:
                        st.error("Please fill in all fields.")
                    else:
                        user = authenticate_user(username, password)
                        if user:
                            login_user(st, user)
                            st.success(f"Welcome back, {user['full_name']}! 🎉")
                            st.rerun()
                        else:
                            st.error("❌ Invalid username or password.")

        with tab2:
            st.markdown("#### Create Account")
            with st.form("register_form"):
                reg_fullname = st.text_input(
                    "Full Name", placeholder="e.g., John Doe"
                )
                reg_email = st.text_input(
                    "Email", placeholder="e.g., john@university.edu"
                )
                reg_username = st.text_input(
                    "Choose Username", placeholder="e.g., john.doe"
                )
                reg_password = st.text_input(
                    "Choose Password",
                    type="password",
                    placeholder="Min 6 characters",
                )
                reg_role = st.selectbox("Role", ["student", "faculty"])
                reg_dept = st.text_input("Department", value="Computer Science")
                reg_submit = st.form_submit_button(
                    "📝 Register", use_container_width=True
                )

                if reg_submit:
                    if not all([reg_fullname, reg_email, reg_username, reg_password]):
                        st.error("Please fill in all required fields.")
                    elif len(reg_password) < 6:
                        st.error("Password must be at least 6 characters.")
                    else:
                        result = register_user(
                            reg_username,
                            reg_password,
                            reg_role,
                            reg_fullname,
                            reg_email,
                            reg_dept,
                        )
                        if result is True:
                            st.success("✅ Registration successful! Please log in.")
                        else:
                            st.error(f"❌ {result}")

    # Features section
    st.divider()
    st.markdown("### ✨ Key Features")

    f1, f2, f3, f4 = st.columns(4)
    with f1:
        st.markdown(
            """
        <div class='info-card'>
        <h4>🤖 AI Assessment</h4>
        <p>Automated evaluation powered by LLM and heuristic analysis</p>
        </div>
        """,
            unsafe_allow_html=True,
        )
    with f2:
        st.markdown(
            """
        <div class='info-card'>
        <h4>📚 RAG Feedback</h4>
        <p>Personalized feedback using course knowledge retrieval</p>
        </div>
        """,
            unsafe_allow_html=True,
        )
    with f3:
        st.markdown(
            """
        <div class='info-card'>
        <h4>📊 Analytics</h4>
        <p>Real-time performance dashboards and learning insights</p>
        </div>
        """,
            unsafe_allow_html=True,
        )
    with f4:
        st.markdown(
            """
        <div class='info-card'>
        <h4>🔐 Dual Portal</h4>
        <p>Secure role-based access for students and faculty</p>
        </div>
        """,
            unsafe_allow_html=True,
        )


def show_welcome_dashboard():
    """Display welcome dashboard for logged-in users."""
    user = get_current_user(st)
    st.markdown(f"# 👋 Welcome, {user['full_name']}!")

    if user["role"] == "student":
        st.markdown("### 🎓 Student Dashboard")
        st.info(
            "Navigate to **🎓 Student Portal** from the sidebar to manage your "
            "assignments and view grades."
        )

        col1, col2, col3 = st.columns(3)
        with col1:
            st.markdown(
                """
            <div class='info-card'>
            <h4>📤 Upload Assignments</h4>
            <p>Submit your work for AI-powered evaluation</p>
            </div>
            """,
                unsafe_allow_html=True,
            )
        with col2:
            st.markdown(
                """
            <div class='info-card'>
            <h4>📝 View Grades</h4>
            <p>See detailed scores with topic-wise breakdown</p>
            </div>
            """,
                unsafe_allow_html=True,
            )
        with col3:
            st.markdown(
                """
            <div class='info-card'>
            <h4>📊 Track Progress</h4>
            <p>Monitor your learning journey with analytics</p>
            </div>
            """,
                unsafe_allow_html=True,
            )
    else:
        st.markdown("### 👨‍🏫 Faculty Dashboard")
        st.info(
            "Navigate to **👨‍🏫 Faculty Portal** from the sidebar to manage "
            "courses and evaluate submissions."
        )

        col1, col2, col3 = st.columns(3)
        with col1:
            st.markdown(
                """
            <div class='info-card'>
            <h4>📋 Manage Assignments</h4>
            <p>Create and track course assignments</p>
            </div>
            """,
                unsafe_allow_html=True,
            )
        with col2:
            st.markdown(
                """
            <div class='info-card'>
            <h4>🤖 AI Evaluation</h4>
            <p>Trigger automated assessment of submissions</p>
            </div>
            """,
                unsafe_allow_html=True,
            )
        with col3:
            st.markdown(
                """
            <div class='info-card'>
            <h4>📈 Class Analytics</h4>
            <p>Monitor class performance and identify gaps</p>
            </div>
            """,
                unsafe_allow_html=True,
            )


# Main app logic
show_sidebar()

if st.session_state.get("authenticated", False):
    show_welcome_dashboard()
else:
    show_login_page()
