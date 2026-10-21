# CS101: Python Fundamentals & Computational Thinking

## 1. Variables, Data Types & Mutability
- Numeric primitives: `int` (arbitrary-precision integer), `float` (IEEE 754 64-bit double precision), `bool`, and `complex`.
- Sequences: `str` (immutable UTF-8 unicode sequence), `list` (mutable dynamic array), `tuple` (immutable sequence).
- Mappings and sets: `dict` (hash table with open addressing, amortized O(1) lookup), `set` (hash set with unique members).

## 2. Functions, Scoping & Clean Design
- Parameter passing in Python uses "call-by-object-reference".
- Type hints (`typing` module) enhance maintainability and IDE validation.
- Defensive programming includes validating parameter types and bounds, raising `ValueError` or `TypeError` on invalid inputs.

## 3. Best Practices & Edge Cases
- Handle empty sequences before computing averages or extrema (`ZeroDivisionError` prevention).
- Document function contracts using standard Google or Sphinx docstrings with Args, Returns, and Raises sections.

