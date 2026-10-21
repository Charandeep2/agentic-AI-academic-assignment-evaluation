# CS201: Data Structures and Algorithms Curriculum

## 1. Linked Lists & Pointer Structures
- Singly Linked Lists: Each node maintains `data` and `next`.
- Doubly Linked Lists: Each node maintains `prev`, `data`, and `next`. Inserting or deleting at the head or tail requires O(1) pointer updates.
- Sentinel (dummy) nodes eliminate edge cases during insertions into empty lists.

## 2. Dynamic Arrays & Complexity Analysis
- Dynamic arrays allocate contiguous memory blocks. Appends are amortized O(1), but capacity doubling incurs O(N) reallocation.
- Indexing is O(1) via base address pointer arithmetic.

## 3. Trees, Binary Search Trees & Traversal
- Binary Search Trees: Left subtree <= Root < Right subtree. Search and insertion are O(h) where h is tree height.
- Traversals: In-order (sorted order for BST), Pre-order (copying/serialization), Post-order (deletion/expression evaluation).
- Balanced Trees (AVL, Red-Black) guarantee O(log N) worst-case time complexity.

