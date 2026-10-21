"""
Authentication and role-based access control for the Academic Assessment System.
Uses bcrypt for password hashing and Streamlit session state for session management.
"""
import bcrypt
from database import get_session, User


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        return False


def authenticate_user(username: str, password: str):
    """
    Authenticate a user by username and password.
    Returns the User object if successful, None otherwise.
    """
    session = get_session()
    try:
        user = session.query(User).filter(User.username == username).first()
        if user and verify_password(password, user.password_hash):
            return {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "full_name": user.full_name,
                "email": user.email,
                "department": user.department,
            }
        return None
    finally:
        session.close()


def register_user(username: str, password: str, role: str, full_name: str,
                   email: str, department: str = "Computer Science"):
    """
    Register a new user.
    Returns True if successful, error message string if failed.
    """
    session = get_session()
    try:
        # Check if username exists
        existing = session.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()
        if existing:
            if existing.username == username:
                return "Username already exists"
            return "Email already registered"

        new_user = User(
            username=username,
            password_hash=hash_password(password),
            role=role,
            full_name=full_name,
            email=email,
            department=department,
        )
        session.add(new_user)
        session.commit()
        return True
    except Exception as e:
        session.rollback()
        return f"Registration failed: {str(e)}"
    finally:
        session.close()


def init_streamlit_auth(st):
    """Initialize authentication state in Streamlit session."""
    if "authenticated" not in st.session_state:
        st.session_state.authenticated = False
    if "user" not in st.session_state:
        st.session_state.user = None


def login_user(st, user_data: dict):
    """Set user as logged in within Streamlit session state."""
    st.session_state.authenticated = True
    st.session_state.user = user_data


def logout_user(st):
    """Clear authentication from Streamlit session state."""
    st.session_state.authenticated = False
    st.session_state.user = None


def require_auth(st, role=None):
    """
    Check if user is authenticated and optionally has the required role.
    Returns True if authorized, displays error and returns False otherwise.
    """
    if not st.session_state.get("authenticated", False):
        st.error("🔒 Please log in to access this page.")
        st.info("Go to the **Home** page to log in.")
        st.stop()
        return False

    if role and st.session_state.user.get("role") != role:
        st.error(f"⛔ Access denied. This page requires **{role}** role.")
        st.stop()
        return False

    return True


def get_current_user(st):
    """Get the currently logged-in user data."""
    return st.session_state.get("user", None)
