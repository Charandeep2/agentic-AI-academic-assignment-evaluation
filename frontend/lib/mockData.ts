import { User, Course, Assignment, Submission, ClassAnalytics, StudentPerformance } from './types';

export const INITIAL_USERS: User[] = [
  {
    id: 'u-faculty-1',
    username: 'dr.smith',
    fullName: 'Dr. Sarah Smith',
    email: 'sarah.smith@university.edu',
    role: 'faculty',
    department: 'Computer Science & AI',
  },
  {
    id: 'u-faculty-2',
    username: 'prof.johnson',
    fullName: 'Prof. Michael Johnson',
    email: 'm.johnson@university.edu',
    role: 'faculty',
    department: 'Software Engineering',
  },
  {
    id: 'u-student-1',
    username: 'alice',
    fullName: 'Alice Anderson',
    email: 'alice@student.edu',
    role: 'student',
    department: 'Computer Science',
  },
  {
    id: 'u-student-2',
    username: 'bob',
    fullName: 'Bob Brown',
    email: 'bob@student.edu',
    role: 'student',
    department: 'Computer Science',
  },
  {
    id: 'u-student-3',
    username: 'charlie',
    fullName: 'Charlie Chen',
    email: 'charlie@student.edu',
    role: 'student',
    department: 'Computer Science',
  },
  {
    id: 'u-student-4',
    username: 'diana',
    fullName: 'Diana Davis',
    email: 'diana@student.edu',
    role: 'student',
    department: 'Computer Science',
  },
  {
    id: 'u-student-5',
    username: 'evan',
    fullName: 'Evan Evans',
    email: 'evan@student.edu',
    role: 'student',
    department: 'Computer Science',
  },
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'c-101',
    code: 'CS101',
    name: 'Introduction to Python & Computational Thinking',
    department: 'Computer Science',
    facultyId: 'u-faculty-1',
    facultyName: 'Dr. Sarah Smith',
    description: 'Foundations of programming, memory management, data types, functions, control flow, and Object-Oriented paradigm.',
    enrolledCount: 5,
  },
  {
    id: 'c-201',
    code: 'CS201',
    name: 'Data Structures and Algorithms',
    department: 'Computer Science',
    facultyId: 'u-faculty-1',
    facultyName: 'Dr. Sarah Smith',
    description: 'Deep study of computational complexity, dynamic arrays, linked lists, trees, graphs, sorting, and recursion.',
    enrolledCount: 5,
  },
  {
    id: 'c-301',
    code: 'CS301',
    name: 'Machine Learning & Neural Representations',
    department: 'Computer Science & AI',
    facultyId: 'u-faculty-2',
    facultyName: 'Prof. Michael Johnson',
    description: 'Supervised and unsupervised learning, gradient descent optimization, loss functions, deep backpropagation, and model metrics.',
    enrolledCount: 4,
  },
];

export const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: 'a-1',
    courseId: 'c-101',
    courseCode: 'CS101',
    title: 'Python Basics, Type Conversions & Strings',
    description: 'Demonstrate numeric types, string immutability, f-string formatting, and type casting with edge-case handling.',
    dueDate: '2026-10-15',
    maxMarks: 100,
    topics: ['Variables', 'Data Types', 'Type Conversion', 'String Formatting'],
    type: 'assignment',
    isOverdue: true,
  },
  {
    id: 'a-2',
    courseId: 'c-101',
    courseCode: 'CS101',
    title: 'Control Structures, Recursion & Higher-Order Functions',
    description: 'Implement iterative search, recursive Fibonacci with memoization, and custom function decorators.',
    dueDate: '2026-10-25',
    maxMarks: 100,
    topics: ['Loops', 'Conditionals', 'Functions', 'Recursion'],
    type: 'assignment',
    isOverdue: false,
  },
  {
    id: 'a-3',
    courseId: 'c-101',
    courseCode: 'CS101',
    title: 'OOP Architecture: Bank Management System',
    description: 'Design robust class hierarchies with inheritance, polymorphism, encapsulation, and error handling.',
    dueDate: '2026-11-05',
    maxMarks: 150,
    topics: ['Classes', 'Inheritance', 'Polymorphism', 'Encapsulation'],
    type: 'project',
    isOverdue: false,
  },
  {
    id: 'a-4',
    courseId: 'c-201',
    courseCode: 'CS201',
    title: 'Dynamic Array & Doubly Linked List Implementation',
    description: 'Build memory-safe dynamic arrays with amortized O(1) resizing and doubly linked lists with O(1) head/tail insertion.',
    dueDate: '2026-10-18',
    maxMarks: 100,
    topics: ['Dynamic Arrays', 'Linked Lists', 'Amortized Complexity', 'Pointers'],
    type: 'assignment',
    isOverdue: true,
  },
  {
    id: 'a-5',
    courseId: 'c-301',
    courseCode: 'CS301',
    title: 'Linear Regression from Scratch with Vectorized Gradient Descent',
    description: 'Implement vectorized multivariate linear regression, mean squared error cost computation, and R² evaluation without scikit-learn.',
    dueDate: '2026-10-16',
    maxMarks: 100,
    topics: ['Linear Regression', 'Gradient Descent', 'Cost Function', 'Model Evaluation'],
    type: 'assignment',
    isOverdue: true,
  },
];

export const INITIAL_SUBMISSIONS: Submission[] = [
  {
    id: 'sub-1',
    assignmentId: 'a-1',
    studentId: 'u-student-1',
    studentName: 'Alice Anderson',
    studentEmail: 'alice@student.edu',
    content: `# Python Basics Assignment - Alice Anderson
# Demonstrating Data Types, Casting, and String Operations

# Numeric primitives
integer_val: int = 42
float_val: float = 3.14159
complex_val: complex = 2 + 3j

# Type conversions
num_str = "1024"
casted_int = int(num_str)
casted_float = float(casted_int)

# String manipulations and f-strings
template = f"Results: Int={casted_int}, Float={casted_float:.2f}, Magnitude={abs(complex_val):.2f}"
print(template)
print(f"Upper: {template.upper()}")
print(f"Tokens: {template.split(', ')}")`,
    fileName: 'alice_cs101_basics.py',
    submittedAt: '2026-10-14 18:20',
    status: 'evaluated',
    evaluation: {
      id: 'eval-1',
      submissionId: 'sub-1',
      overallScore: 92,
      maxScore: 100,
      percentage: 92,
      masteryLevel: 'expert',
      topicScores: {
        'Variables': 95,
        'Data Types': 94,
        'Type Conversion': 90,
        'String Formatting': 89,
      },
      strengths: [
        'Used Python type annotations correctly across variables',
        'Implemented modern f-string float precision specifiers',
        'Demonstrated complex numbers and abs() magnitude calculation',
      ],
      weaknesses: [
        'Could include try-except blocks when converting user-provided strings to integers',
      ],
      feedback: 'Outstanding submission Alice! Your implementation is concise, uses modern Python 3.12 typing conventions, and handles string operations cleanly. You have achieved expert mastery in basic Python types.',
      suggestions: [
        'Explore collections.namedtuple or dataclasses for structured data schemas',
        'Read PEP 8 guidelines on constant naming conventions',
      ],
      ragContextUsed: [
        'Course Notes CS101: Section 1.3 Primitive types and IEEE 754 float precision',
        'Python Standard Library doc on str.format and format-specifiers',
      ],
      evaluatedBy: 'AI Assessment Agent (RAG-Augmented)',
      evaluatedAt: '2026-10-14 18:22',
    },
  },
  {
    id: 'sub-2',
    assignmentId: 'a-1',
    studentId: 'u-student-2',
    studentName: 'Bob Brown',
    studentEmail: 'bob@student.edu',
    content: `# Assignment 1
x = 10
y = "20"
z = x + int(y)
print("Sum is " + str(z))`,
    fileName: 'bob_a1.py',
    submittedAt: '2026-10-15 22:45',
    status: 'evaluated',
    evaluation: {
      id: 'eval-2',
      submissionId: 'sub-2',
      overallScore: 54,
      maxScore: 100,
      percentage: 54,
      masteryLevel: 'beginner',
      topicScores: {
        'Variables': 65,
        'Data Types': 55,
        'Type Conversion': 60,
        'String Formatting': 38,
      },
      strengths: [
        'Successfully converted string y to integer for numeric summation',
        'Working basic code without syntax errors',
      ],
      weaknesses: [
        'Missing demonstrations of float, complex, or collection data types',
        'Uses outdated string concatenation rather than f-strings',
        'Lacks comments, docstrings, or structured problem decomposition',
      ],
      feedback: 'Bob, you have demonstrated the basic concept of casting string to integer. However, the assignment required a comprehensive survey of data types, string formatting methods, and type conversion edge cases.',
      suggestions: [
        'Review CS101 Lecture 2 on String formatting and f-strings',
        'Implement examples with floats, booleans, and slicing',
        'Practice formatting numbers with decimals using f"{val:.2f}"',
      ],
      ragContextUsed: [
        'CS101 Chapter 2: String Formatting, Interpolation & Builtin Methods',
      ],
      evaluatedBy: 'AI Assessment Agent (RAG-Augmented)',
      evaluatedAt: '2026-10-15 22:47',
    },
  },
  {
    id: 'sub-3',
    assignmentId: 'a-4',
    studentId: 'u-student-1',
    studentName: 'Alice Anderson',
    studentEmail: 'alice@student.edu',
    content: `class Node:
    def __init__(self, data):
        self.data = data
        self.prev = None
        self.next = None

class DoublyLinkedList:
    def __init__(self):
        self.head = None
        self.tail = None
        self.size = 0

    def append(self, data):
        new_node = Node(data)
        if not self.head:
            self.head = self.tail = new_node
        else:
            self.tail.next = new_node
            new_node.prev = self.tail
            self.tail = new_node
        self.size += 1

    def prepend(self, data):
        new_node = Node(data)
        if not self.head:
            self.head = self.tail = new_node
        else:
            new_node.next = self.head
            self.head.prev = new_node
            self.head = new_node
        self.size += 1`,
    fileName: 'doubly_linked_list.py',
    submittedAt: '2026-10-17 14:10',
    status: 'evaluated',
    evaluation: {
      id: 'eval-3',
      submissionId: 'sub-3',
      overallScore: 88,
      maxScore: 100,
      percentage: 88,
      masteryLevel: 'advanced',
      topicScores: {
        'Dynamic Arrays': 80,
        'Linked Lists': 94,
        'Amortized Complexity': 85,
        'Pointers': 92,
      },
      strengths: [
        'Clean pointer updates in DoublyLinkedList append and prepend',
        'Maintains both head and tail pointers for O(1) boundary operations',
        'Size tracked accurately during mutations',
      ],
      weaknesses: [
        'Missing removal (delete_node) and search methods',
        'Dynamic array implementation was omitted in this submission snippet',
      ],
      feedback: 'Very clean pointer architecture! Your DoublyLinkedList handles empty and populated states gracefully. Add node deletion and iterator support to round out this structure.',
      suggestions: [
        'Implement __iter__ for seamless Pythonic traversal',
        'Add delete(value) with attention to boundary edge conditions',
      ],
      ragContextUsed: [
        'CS201 Lecture 4: Doubly Linked Lists & Sentinel Node Patterns',
      ],
      evaluatedBy: 'AI Assessment Agent (RAG-Augmented)',
      evaluatedAt: '2026-10-17 14:12',
    },
  },
  {
    id: 'sub-4',
    assignmentId: 'a-5',
    studentId: 'u-student-3',
    studentName: 'Charlie Chen',
    studentEmail: 'charlie@student.edu',
    content: `import numpy as np

class VectorizedLinearRegression:
    def __init__(self, learning_rate=0.01, iterations=1000):
        self.lr = learning_rate
        self.iterations = iterations
        self.weights = None
        self.bias = 0.0
        self.cost_history = []

    def fit(self, X: np.ndarray, y: np.ndarray):
        n_samples, n_features = X.shape
        self.weights = np.zeros(n_features)
        
        for _ in range(self.iterations):
            y_pred = np.dot(X, self.weights) + self.bias
            # Vectorized gradient
            dw = (1 / n_samples) * np.dot(X.T, (y_pred - y))
            db = (1 / n_samples) * np.sum(y_pred - y)
            
            self.weights -= self.lr * dw
            self.bias -= self.lr * db
            
            cost = (1 / (2 * n_samples)) * np.sum((y_pred - y) ** 2)
            self.cost_history.append(cost)

    def predict(self, X: np.ndarray):
        return np.dot(X, self.weights) + self.bias`,
    fileName: 'charlie_regression.py',
    submittedAt: '2026-10-16 11:30',
    status: 'evaluated',
    evaluation: {
      id: 'eval-4',
      submissionId: 'sub-4',
      overallScore: 96,
      maxScore: 100,
      percentage: 96,
      masteryLevel: 'expert',
      topicScores: {
        'Linear Regression': 98,
        'Gradient Descent': 96,
        'Cost Function': 95,
        'Model Evaluation': 94,
      },
      strengths: [
        'Flawless vectorized matrix gradient computation with X.T @ error',
        'Tracks cost history across iterations to monitor convergence',
        'Clean, idiomatic NumPy vectorization without slow Python loops',
      ],
      weaknesses: [
        'Could include automated feature normalization (Z-score scaling)',
      ],
      feedback: 'Charlie, this is an exemplary implementation of vectorized batch gradient descent. The matrix dimension broadcasting is mathematically sound and computationally optimal.',
      suggestions: [
        'Add an early stopping condition when delta cost < epsilon',
        'Implement R² score and Mean Absolute Error helper methods',
      ],
      ragContextUsed: [
        'CS301 Module 2: Multivariate Gradient Descent and Convex Optimization',
      ],
      evaluatedBy: 'AI Assessment Agent (RAG-Augmented)',
      evaluatedAt: '2026-10-16 11:32',
    },
  },
];

export const KNOWLEDGE_BASE_DOCS = [
  {
    title: 'CS101: Python Fundamentals & Data Types',
    course: 'CS101',
    excerpt: 'Python numeric types include int (arbitrary precision), float (IEEE 754 64-bit), and complex. Strings are immutable UTF-8 sequences. Formatted string literals (f-strings) provide syntax for expression interpolation using format specifiers such as {:.2f}.',
    keyConcepts: ['Variables', 'Data Types', 'Type Casting', 'f-strings', 'Mutability'],
  },
  {
    title: 'CS201: Linked Lists & Algorithmic Complexity',
    course: 'CS201',
    excerpt: 'Doubly linked lists store pointers to both next and previous nodes. Inserting at the head or tail requires O(1) pointer updates. Dynamic arrays achieve amortized O(1) append by doubling capacity upon overflow, though individual worst-case resize operations require O(N) memory copy.',
    keyConcepts: ['Dynamic Arrays', 'Doubly Linked Lists', 'Amortized Complexity', 'Pointers'],
  },
  {
    title: 'CS301: Linear Regression & Gradient Descent Optimization',
    course: 'CS301',
    excerpt: 'The Mean Squared Error (MSE) objective function is convex for linear regression. Vectorized gradient updates compute weight deltas as (1/m) * X^T * (X*w + b - y). Learning rate alpha must be tuned to prevent divergence or overly sluggish convergence.',
    keyConcepts: ['Linear Regression', 'Gradient Descent', 'Cost Function', 'Convergence', 'R2 Metric'],
  },
];
