# Theoretical Analysis of Python Mutability and Memory Architecture

## 1. Introduction and Memory Invariants
In the standard CPython runtime, every variable is a pointer pointing to an underlying PyObject on the heap. A PyObject contains two mandatory fields: ob_refcnt (reference count for automatic garbage collection) and ob_type (type descriptor).

## 2. Mutability vs Immutability
- Immutable types (integers, strings, tuples, frozensets) guarantee that the object value cannot change after instantiation. Any operation that appears to mutate an immutable object actually allocates a new object in memory.
- Mutable types (lists, dictionaries, sets) allow in-place modification of their internal pointers without altering the identity (id) of the container object.

## 3. Practical Implications and Trade-offs
When passing arguments to functions in Python, parameters are passed by object reference (call-by-sharing). If a function modifies a mutable argument (e.g. appending to a list), the change reflects globally in the caller's scope. Conversely, assigning to an immutable parameter creates a local binding, isolating caller state.

## 4. Conclusion
Understanding these memory invariants is essential to prevent subtle bugs like mutable default arguments and unintended side effects across concurrent coroutines.