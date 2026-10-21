class BSTNode:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None

class BinarySearchTree:
    def __init__(self):
        self.root = None

    def insert(self, key):
        if not self.root:
            self.root = BSTNode(key)
        else:
            self._insert_rec(self.root, key)

    def _insert_rec(self, node, key):
        if key < node.key:
            if node.left is None:
                node.left = BSTNode(key)
            else:
                self._insert_rec(node.left, key)
        elif key > node.key:
            if node.right is None:
                node.right = BSTNode(key)
            else:
                self._insert_rec(node.right, key)

    def search(self, key):
        curr = self.root
        while curr:
            if curr.key == key:
                return True
            elif key < curr.key:
                curr = curr.left
            else:
                curr = curr.right
        return False

    def inorder(self):
        result = []
        def traverse(node):
            if node:
                traverse(node.left)
                result.append(node.key)
                traverse(node.right)
        traverse(self.root)
        return result