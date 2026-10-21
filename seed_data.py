"""
Seed data for the Academic Assessment System.
Creates demo users, courses, assignments, submissions, and evaluations.
"""
import json
from datetime import datetime, timedelta
from database import init_db, get_session, User, Course, Enrollment, Assignment, Submission, Evaluation
from auth import hash_password


def seed_database():
    """Populate the database with comprehensive demo data."""
    init_db()
    session = get_session()

    try:
        # Check if already seeded
        if session.query(User).count() > 0:
            print("Database already seeded. Skipping...")
            return

        # ============ USERS ============
        faculty1 = User(
            username="dr.smith",
            password_hash=hash_password("faculty123"),
            role="faculty",
            full_name="Dr. Sarah Smith",
            email="sarah.smith@university.edu",
            department="Computer Science",
        )
        faculty2 = User(
            username="prof.johnson",
            password_hash=hash_password("faculty123"),
            role="faculty",
            full_name="Prof. Michael Johnson",
            email="michael.johnson@university.edu",
            department="Computer Science",
        )

        students = []
        student_data = [
            ("alice", "Alice Anderson", "alice@student.edu"),
            ("bob", "Bob Brown", "bob@student.edu"),
            ("charlie", "Charlie Chen", "charlie@student.edu"),
            ("diana", "Diana Davis", "diana@student.edu"),
            ("evan", "Evan Evans", "evan@student.edu"),
        ]
        for uname, fname, email in student_data:
            students.append(User(
                username=uname,
                password_hash=hash_password("student123"),
                role="student",
                full_name=fname,
                email=email,
                department="Computer Science",
            ))

        session.add_all([faculty1, faculty2] + students)
        session.flush()  # Get IDs

        # ============ COURSES ============
        course1 = Course(
            code="CS101",
            name="Introduction to Python Programming",
            department="Computer Science",
            faculty_id=faculty1.id,
            description="Fundamentals of programming using Python. Covers variables, control flow, functions, OOP, and file handling.",
        )
        course2 = Course(
            code="CS201",
            name="Data Structures and Algorithms",
            department="Computer Science",
            faculty_id=faculty1.id,
            description="Study of fundamental data structures and algorithm design. Covers arrays, linked lists, trees, graphs, sorting, and searching.",
        )
        course3 = Course(
            code="CS301",
            name="Machine Learning Fundamentals",
            department="Computer Science",
            faculty_id=faculty2.id,
            description="Introduction to machine learning concepts. Covers regression, classification, clustering, neural networks, and model evaluation.",
        )
        session.add_all([course1, course2, course3])
        session.flush()

        # ============ ENROLLMENTS ============
        # All students in CS101, first 4 in CS201, first 3 in CS301
        enrollments = []
        for s in students:
            enrollments.append(Enrollment(student_id=s.id, course_id=course1.id))
        for s in students[:4]:
            enrollments.append(Enrollment(student_id=s.id, course_id=course2.id))
        for s in students[:3]:
            enrollments.append(Enrollment(student_id=s.id, course_id=course3.id))
        session.add_all(enrollments)
        session.flush()

        # ============ ASSIGNMENTS ============
        now = datetime.utcnow()

        assignments = [
            # CS101 Assignments
            Assignment(
                course_id=course1.id,
                title="Python Basics - Variables & Data Types",
                description="Write a Python program demonstrating the use of different data types, variables, type conversion, and string operations.",
                due_date=now - timedelta(days=10),  # Past due
                max_marks=100,
                topics_json=json.dumps(["Variables", "Data Types", "Type Conversion", "String Operations"]),
                assignment_type="assignment",
            ),
            Assignment(
                course_id=course1.id,
                title="Control Flow & Functions",
                description="Implement programs using if-else statements, loops, and user-defined functions. Include recursion examples.",
                due_date=now - timedelta(days=3),  # Past due
                max_marks=100,
                topics_json=json.dumps(["Conditionals", "Loops", "Functions", "Recursion"]),
                assignment_type="assignment",
            ),
            Assignment(
                course_id=course1.id,
                title="OOP Concepts Project",
                description="Design a library management system using OOP principles: classes, inheritance, polymorphism, and encapsulation.",
                due_date=now + timedelta(days=7),  # Future
                max_marks=150,
                topics_json=json.dumps(["Classes", "Inheritance", "Polymorphism", "Encapsulation"]),
                assignment_type="project",
            ),
            # CS201 Assignments
            Assignment(
                course_id=course2.id,
                title="Array & Linked List Implementation",
                description="Implement dynamic arrays and singly/doubly linked lists with all standard operations.",
                due_date=now - timedelta(days=5),
                max_marks=100,
                topics_json=json.dumps(["Arrays", "Linked Lists", "Time Complexity", "Memory Management"]),
                assignment_type="assignment",
            ),
            Assignment(
                course_id=course2.id,
                title="Tree & Graph Algorithms",
                description="Implement BST operations, tree traversals, BFS, DFS, and shortest path algorithms.",
                due_date=now + timedelta(days=14),
                max_marks=100,
                topics_json=json.dumps(["Binary Trees", "BST", "Graph Traversal", "Shortest Path"]),
                assignment_type="project",
            ),
            # CS301 Assignments
            Assignment(
                course_id=course3.id,
                title="Linear Regression Analysis",
                description="Implement linear regression from scratch, apply it to a real dataset, and analyze results with visualization.",
                due_date=now - timedelta(days=7),
                max_marks=100,
                topics_json=json.dumps(["Linear Regression", "Gradient Descent", "Cost Function", "Model Evaluation"]),
                assignment_type="assignment",
            ),
            Assignment(
                course_id=course3.id,
                title="Classification with Neural Networks",
                description="Build a neural network classifier for image recognition. Compare performance with traditional ML methods.",
                due_date=now + timedelta(days=21),
                max_marks=150,
                topics_json=json.dumps(["Neural Networks", "Classification", "Backpropagation", "Model Comparison"]),
                assignment_type="project",
            ),
        ]
        session.add_all(assignments)
        session.flush()

        # ============ SUBMISSIONS & EVALUATIONS ============
        # Create realistic submissions with varied content quality

        submission_eval_data = [
            # (student_index, assignment_index, content, status, score, mastery, strengths, weaknesses)
            (0, 0, "# Python Basics Assignment\n\n## Variables and Data Types\n\nPython supports several built-in data types:\n\n```python\n# Integer\nage = 25\n\n# Float\ntemperature = 98.6\n\n# String\nname = 'Alice'\n\n# Boolean\nis_student = True\n\n# Type conversion\nage_str = str(age)\ntemp_int = int(temperature)\n\n# String operations\ngreeting = f'Hello, {name}! You are {age} years old.'\nprint(greeting.upper())\nprint(greeting.split())\nprint(len(name))\n```\n\nI demonstrated all four basic data types with clear examples and showed type conversion between them. String formatting uses f-strings which is the modern Python approach.",
             "evaluated", 88.0, "advanced",
             "Excellent understanding of basic data types. Good use of f-strings and string methods. Clear code organization.",
             "Could include more complex type conversions. Missing list and dictionary examples."),

            (1, 0, "# Variables Assignment\nx = 10\ny = 'hello'\nprint(x)\nprint(y)",
             "evaluated", 52.0, "beginner",
             "Shows basic variable assignment.",
             "Very minimal implementation. Missing type conversion, string operations, and comprehensive data type coverage."),

            (2, 0, "# Python Data Types\n\n## All Data Types Covered\n\n```python\n# Numeric types\ninteger_val = 42\nfloat_val = 3.14159\ncomplex_val = 2 + 3j\n\n# Sequence types\nmy_list = [1, 2, 3, 4, 5]\nmy_tuple = (1, 2, 3)\nmy_range = range(10)\n\n# Text type\nmy_string = 'Hello, World!'\n\n# Set types\nmy_set = {1, 2, 3}\nmy_frozenset = frozenset([1, 2, 3])\n\n# Mapping type\nmy_dict = {'name': 'Charlie', 'age': 20}\n\n# Boolean\nis_valid = True\n\n# Type conversions\nstr_num = '123'\nint_from_str = int(str_num)\nfloat_from_str = float(str_num)\nlist_from_str = list(my_string)\n\n# String operations\nprint(my_string.lower())\nprint(my_string.replace('World', 'Python'))\nprint(my_string[:5])\nprint(' '.join(['Hello', 'Python']))\nprint(f'Name: {my_dict[\"name\"]}, Age: {my_dict[\"age\"]}')\n```\n\nThis covers all Python built-in data types with comprehensive examples.",
             "evaluated", 95.0, "expert",
             "Comprehensive coverage of ALL Python data types including complex, frozenset. Excellent string operations with slicing, methods, and f-strings.",
             "Minor: Could add docstrings and error handling examples."),

            (3, 0, "# Basic Python\nname = input('Enter name: ')\nage = int(input('Enter age: '))\nprint(f'{name} is {age} years old')\npi = 3.14\nresult = age * pi\nprint(type(result))",
             "evaluated", 65.0, "intermediate",
             "Good use of input/output. Shows type conversion with int(). Uses f-strings.",
             "Limited scope. Missing many data types and string operations. No demonstrations of boolean, list, or dictionary types."),

            (0, 1, "# Control Flow & Functions\n\ndef fibonacci(n):\n    '''Generate fibonacci sequence up to n terms using recursion'''\n    if n <= 0:\n        return []\n    elif n == 1:\n        return [0]\n    elif n == 2:\n        return [0, 1]\n    else:\n        seq = fibonacci(n - 1)\n        seq.append(seq[-1] + seq[-2])\n        return seq\n\ndef is_prime(num):\n    '''Check if a number is prime'''\n    if num < 2:\n        return False\n    for i in range(2, int(num**0.5) + 1):\n        if num % i == 0:\n            return False\n    return True\n\n# Control flow examples\nfor i in range(1, 21):\n    if is_prime(i):\n        print(f'{i} is prime')\n    elif i % 2 == 0:\n        print(f'{i} is even')\n    else:\n        print(f'{i} is odd')\n\nprint('Fibonacci(10):', fibonacci(10))",
             "evaluated", 91.0, "advanced",
             "Strong implementation of recursion and prime checking. Clean code with docstrings. Good use of control flow.",
             "Could include more loop patterns (while, nested loops). Error handling for edge cases could be improved."),

            (1, 1, "# Loops and functions\nfor i in range(10):\n    print(i)\n\ndef add(a, b):\n    return a + b\n\nresult = add(5, 3)\nprint(result)",
             "evaluated", 45.0, "beginner",
             "Basic understanding of loops and functions.",
             "Very minimal. Missing recursion, conditionals beyond basic, and any complex function examples. No docstrings."),

            (2, 1, "# Advanced Control Flow\n\ndef merge_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    mid = len(arr) // 2\n    left = merge_sort(arr[:mid])\n    right = merge_sort(arr[mid:])\n    return merge(left, right)\n\ndef merge(left, right):\n    result = []\n    i = j = 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:\n            result.append(left[i])\n            i += 1\n        else:\n            result.append(right[j])\n            j += 1\n    result.extend(left[i:])\n    result.extend(right[j:])\n    return result\n\ndef factorial(n):\n    if n <= 1: return 1\n    return n * factorial(n-1)\n\ndef gcd(a, b):\n    while b: a, b = b, a % b\n    return a\n\n# Menu-driven calculator\ndef calculator():\n    while True:\n        print('1.Add 2.Sub 3.Mul 4.Div 5.Exit')\n        choice = int(input('Choice: '))\n        if choice == 5: break\n        a, b = float(input('a: ')), float(input('b: '))\n        ops = {1: a+b, 2: a-b, 3: a*b, 4: a/b if b!=0 else 'Error'}\n        print(f'Result: {ops.get(choice, \"Invalid\")}')",
             "evaluated", 93.0, "expert",
             "Outstanding implementation. Merge sort shows advanced recursion. GCD and factorial are clean. Menu-driven calculator uses dictionary dispatch.",
             "Calculator could have better error handling. Missing explicit examples of while loop patterns."),

            # CS201 submissions
            (0, 3, "# Array & Linked List Implementation\n\nclass DynamicArray:\n    def __init__(self):\n        self._capacity = 1\n        self._size = 0\n        self._data = [None] * self._capacity\n    \n    def append(self, item):\n        if self._size == self._capacity:\n            self._resize(2 * self._capacity)\n        self._data[self._size] = item\n        self._size += 1\n    \n    def _resize(self, new_cap):\n        new_data = [None] * new_cap\n        for i in range(self._size):\n            new_data[i] = self._data[i]\n        self._data = new_data\n        self._capacity = new_cap\n\nclass Node:\n    def __init__(self, data):\n        self.data = data\n        self.next = None\n        self.prev = None\n\nclass DoublyLinkedList:\n    def __init__(self):\n        self.head = None\n        self.tail = None\n        self.size = 0\n    \n    def append(self, data):\n        node = Node(data)\n        if not self.head:\n            self.head = self.tail = node\n        else:\n            node.prev = self.tail\n            self.tail.next = node\n            self.tail = node\n        self.size += 1\n    \n    def delete(self, data):\n        current = self.head\n        while current:\n            if current.data == data:\n                if current.prev: current.prev.next = current.next\n                else: self.head = current.next\n                if current.next: current.next.prev = current.prev\n                else: self.tail = current.prev\n                self.size -= 1\n                return True\n            current = current.next\n        return False",
             "evaluated", 85.0, "advanced",
             "Solid DynamicArray with resize logic. Good DoublyLinkedList with proper prev/next management and delete operation.",
             "Missing search, insert_at operations. No time complexity analysis in comments."),

            (2, 3, "# Arrays and Linked Lists\nclass LinkedList:\n    def __init__(self):\n        self.head = None\n    \n    def insert(self, data):\n        node = type('Node', (), {'data': data, 'next': self.head})()\n        self.head = node\n    \n    def display(self):\n        curr = self.head\n        while curr:\n            print(curr.data, end=' -> ')\n            curr = curr.next\n        print('None')\n\narr = [1, 2, 3, 4, 5]\nll = LinkedList()\nfor x in arr: ll.insert(x)\nll.display()",
             "evaluated", 70.0, "intermediate",
             "Creative use of type() for node creation. Basic linked list works correctly.",
             "Only singly linked list implemented. Missing dynamic array. No doubly linked list. Limited operations."),

            # CS301 submissions
            (0, 5, "# Linear Regression from Scratch\nimport numpy as np\n\nclass LinearRegression:\n    def __init__(self, lr=0.01, epochs=1000):\n        self.lr = lr\n        self.epochs = epochs\n        self.weights = None\n        self.bias = None\n        self.history = []\n    \n    def fit(self, X, y):\n        n_samples, n_features = X.shape\n        self.weights = np.zeros(n_features)\n        self.bias = 0\n        \n        for epoch in range(self.epochs):\n            y_pred = np.dot(X, self.weights) + self.bias\n            dw = (1/n_samples) * np.dot(X.T, (y_pred - y))\n            db = (1/n_samples) * np.sum(y_pred - y)\n            self.weights -= self.lr * dw\n            self.bias -= self.lr * db\n            cost = np.mean((y_pred - y)**2)\n            self.history.append(cost)\n    \n    def predict(self, X):\n        return np.dot(X, self.weights) + self.bias\n    \n    def r2_score(self, X, y):\n        y_pred = self.predict(X)\n        ss_res = np.sum((y - y_pred)**2)\n        ss_tot = np.sum((y - np.mean(y))**2)\n        return 1 - (ss_res / ss_tot)\n\n# Demo with synthetic data\nnp.random.seed(42)\nX = 2 * np.random.rand(100, 1)\ny = 4 + 3 * X.squeeze() + np.random.randn(100) * 0.5\nmodel = LinearRegression(lr=0.1, epochs=500)\nmodel.fit(X, y)\nprint(f'R2 Score: {model.r2_score(X, y):.4f}')\nprint(f'Weights: {model.weights}, Bias: {model.bias:.4f}')",
             "evaluated", 92.0, "expert",
             "Excellent implementation from scratch. Proper gradient descent with learning rate. Includes cost history tracking and R² score. Well-structured OOP.",
             "Could include feature scaling/normalization. Missing visualization code and comparison with sklearn."),

            (1, 5, "# Linear Regression\nfrom sklearn.linear_model import LinearRegression\nimport numpy as np\nX = np.array([[1],[2],[3],[4],[5]])\ny = np.array([2,4,6,8,10])\nmodel = LinearRegression()\nmodel.fit(X, y)\nprint(model.predict([[6]]))",
             "evaluated", 40.0, "beginner",
             "Uses sklearn correctly for basic prediction.",
             "Not implemented from scratch as required. Trivial dataset. No gradient descent, cost function analysis, or model evaluation metrics."),
        ]

        for s_idx, a_idx, content, status, score, mastery, strengths, weaknesses in submission_eval_data:
            sub = Submission(
                assignment_id=assignments[a_idx].id,
                student_id=students[s_idx].id,
                content=content,
                file_name=f"{students[s_idx].username}_{assignments[a_idx].title[:20].replace(' ', '_')}.py",
                submitted_at=now - timedelta(days=max(1, 12 - a_idx * 2)),
                status=status,
            )
            session.add(sub)
            session.flush()

            if status == "evaluated":
                topics = assignments[a_idx].topics
                topic_scores = {}
                import random
                random.seed(s_idx * 100 + a_idx)
                base = score
                for topic in topics:
                    variation = random.uniform(-15, 15)
                    topic_scores[topic] = max(10, min(100, base + variation))

                evaluation = Evaluation(
                    submission_id=sub.id,
                    overall_score=score,
                    max_score=assignments[a_idx].max_marks,
                    topic_scores_json=json.dumps(topic_scores),
                    strengths=strengths,
                    weaknesses=weaknesses,
                    feedback=f"Overall Assessment: Your submission demonstrates a {mastery} level understanding. {strengths} However, {weaknesses.lower()} Focus on strengthening the weaker areas to improve your mastery.",
                    suggestions=f"Recommended: Review the course materials on {', '.join(topics[:2])} for deeper understanding. Practice more problems to solidify concepts.",
                    mastery_level=mastery,
                    evaluated_by="AI Assessment Agent",
                    evaluated_at=now - timedelta(days=max(0, 10 - a_idx * 2)),
                )
                session.add(evaluation)

        session.commit()
        print("Database seeded successfully with demo data!")
        print(f"  - {len([faculty1, faculty2])} faculty members")
        print(f"  - {len(students)} students")
        print(f"  - {len([course1, course2, course3])} courses")
        print(f"  - {len(assignments)} assignments")
        print(f"  - {len(submission_eval_data)} submissions with evaluations")

    except Exception as e:
        session.rollback()
        print(f"Seeding failed: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_database()
