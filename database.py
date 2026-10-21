"""
Database models and setup for the Academic Assessment System.
Uses SQLAlchemy ORM with SQLite backend.
"""
import json
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Text, DateTime,
    ForeignKey, Boolean, UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from config import DATABASE_URL

Base = declarative_base()
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)


class User(Base):
    """User model supporting both students and faculty."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(128), nullable=False)
    role = Column(String(10), nullable=False)  # 'student' or 'faculty'
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    department = Column(String(100), default="Computer Science")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    taught_courses = relationship("Course", back_populates="faculty", foreign_keys="Course.faculty_id")
    enrollments = relationship("Enrollment", back_populates="student")
    submissions = relationship("Submission", back_populates="student")

    def __repr__(self):
        return f"<User(username='{self.username}', role='{self.role}')>"


class Course(Base):
    """Course model."""
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    department = Column(String(100), default="Computer Science")
    faculty_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    faculty = relationship("User", back_populates="taught_courses", foreign_keys=[faculty_id])
    enrollments = relationship("Enrollment", back_populates="course")
    assignments = relationship("Assignment", back_populates="course")

    def __repr__(self):
        return f"<Course(code='{self.code}', name='{self.name}')>"


class Enrollment(Base):
    """Student-Course enrollment mapping."""
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    enrolled_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint('student_id', 'course_id', name='uq_enrollment'),)

    # Relationships
    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")


class Assignment(Base):
    """Assignment model with topic tagging."""
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    due_date = Column(DateTime, nullable=True)
    max_marks = Column(Float, default=100.0)
    topics_json = Column(Text, default="[]")  # JSON array of topic strings
    assignment_type = Column(String(20), default="assignment")  # assignment, project, quiz, lab
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment")

    @property
    def topics(self):
        """Parse topics from JSON."""
        try:
            return json.loads(self.topics_json) if self.topics_json else []
        except json.JSONDecodeError:
            return []

    @topics.setter
    def topics(self, value):
        """Store topics as JSON."""
        self.topics_json = json.dumps(value)

    @property
    def is_overdue(self):
        """Check if assignment is past due date."""
        if self.due_date:
            return datetime.utcnow() > self.due_date
        return False

    def __repr__(self):
        return f"<Assignment(title='{self.title}')>"


class Submission(Base):
    """Student submission for an assignment."""
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_path = Column(String(500), default="")
    file_name = Column(String(200), default="")
    content = Column(Text, default="")  # Extracted text content for AI processing
    submitted_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="submitted")  # submitted, evaluating, evaluated

    __table_args__ = (UniqueConstraint('assignment_id', 'student_id', name='uq_submission'),)

    # Relationships
    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="submissions")
    evaluation = relationship("Evaluation", back_populates="submission", uselist=False)

    def __repr__(self):
        return f"<Submission(student_id={self.student_id}, assignment='{self.assignment_id}', status='{self.status}')>"


class Evaluation(Base):
    """AI or Faculty evaluation of a submission."""
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), unique=True, nullable=False)
    overall_score = Column(Float, default=0.0)
    max_score = Column(Float, default=100.0)
    topic_scores_json = Column(Text, default="{}")  # JSON: {"topic_name": score_out_of_100}
    strengths = Column(Text, default="")
    weaknesses = Column(Text, default="")
    feedback = Column(Text, default="")
    suggestions = Column(Text, default="")
    mastery_level = Column(String(20), default="beginner")  # beginner, intermediate, advanced, expert
    evaluated_by = Column(String(50), default="AI Agent")
    evaluated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    submission = relationship("Submission", back_populates="evaluation")

    @property
    def topic_scores(self):
        try:
            return json.loads(self.topic_scores_json) if self.topic_scores_json else {}
        except json.JSONDecodeError:
            return {}

    @topic_scores.setter
    def topic_scores(self, value):
        self.topic_scores_json = json.dumps(value)

    @property
    def percentage(self):
        if self.max_score > 0:
            return round((self.overall_score / self.max_score) * 100, 1)
        return 0.0

    def __repr__(self):
        return f"<Evaluation(score={self.overall_score}/{self.max_score}, mastery='{self.mastery_level}')>"


def init_db():
    """Create all database tables."""
    Base.metadata.create_all(engine)
    return engine


def get_session():
    """Get a new database session."""
    return SessionLocal()


if __name__ == "__main__":
    init_db()
    print("Database tables created successfully!")
