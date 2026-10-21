"""
Knowledge Base - RAG pipeline using ChromaDB for storing and retrieving course materials.
Supports loading documents from the knowledge_base_docs directory.
"""
import os
import sys
sys.path.insert(0, '.')

from config import CHROMA_PERSIST_DIR, KNOWLEDGE_BASE_DIR, CHUNK_SIZE, CHUNK_OVERLAP

# Try to import ChromaDB
try:
    import chromadb
    from chromadb.config import Settings
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False


class KnowledgeBase:
    """
    RAG Knowledge Base using ChromaDB for vector storage.
    
    Loads course materials from markdown/text files, chunks them,
    and stores embeddings for semantic retrieval during feedback generation.
    """

    def __init__(self):
        """Initialize the knowledge base with ChromaDB."""
        self.is_available = CHROMA_AVAILABLE
        self.collection = None
        
        if self.is_available:
            try:
                self.client = chromadb.Client(Settings(
                    chroma_db_impl="duckdb+parquet",
                    persist_directory=CHROMA_PERSIST_DIR,
                    anonymized_telemetry=False,
                ))
            except Exception:
                # Newer ChromaDB versions
                try:
                    self.client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
                except Exception:
                    self.client = chromadb.Client()
            
            try:
                self.collection = self.client.get_or_create_collection(
                    name="course_materials",
                    metadata={"hnsw:space": "cosine"},
                )
            except Exception as e:
                print(f"ChromaDB collection creation failed: {e}")
                self.is_available = False
        
        # Fallback: in-memory simple search
        self.documents = []
        self.doc_metadata = []

    def load_documents(self, directory: str = None):
        """
        Load all documents from the knowledge base directory.
        Supports .md, .txt, and .py files.
        """
        doc_dir = directory or KNOWLEDGE_BASE_DIR
        if not os.path.exists(doc_dir):
            print(f"Knowledge base directory not found: {doc_dir}")
            return 0

        loaded = 0
        for filename in os.listdir(doc_dir):
            filepath = os.path.join(doc_dir, filename)
            if not os.path.isfile(filepath):
                continue
            if not filename.endswith(('.md', '.txt', '.py')):
                continue

            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()

                chunks = self._chunk_text(content, CHUNK_SIZE, CHUNK_OVERLAP)
                
                for i, chunk in enumerate(chunks):
                    doc_id = f"{filename}_chunk_{i}"
                    metadata = {
                        "source": filename,
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                    }

                    # Store in ChromaDB if available
                    if self.is_available and self.collection is not None:
                        try:
                            self.collection.upsert(
                                ids=[doc_id],
                                documents=[chunk],
                                metadatas=[metadata],
                            )
                        except Exception as e:
                            print(f"ChromaDB upsert failed for {doc_id}: {e}")

                    # Always store in memory as fallback
                    self.documents.append(chunk)
                    self.doc_metadata.append(metadata)
                    loaded += 1

            except Exception as e:
                print(f"Failed to load {filename}: {e}")

        print(f"Loaded {loaded} chunks from {doc_dir}")
        
        # Try to persist ChromaDB
        if self.is_available:
            try:
                if hasattr(self.client, 'persist'):
                    self.client.persist()
            except Exception:
                pass

        return loaded

    def query(self, query_text: str, n_results: int = 3) -> list:
        """
        Query the knowledge base for relevant documents.
        
        Args:
            query_text: The search query
            n_results: Number of results to return
            
        Returns:
            List of relevant document chunks
        """
        # Try ChromaDB first
        if self.is_available and self.collection is not None:
            try:
                count = self.collection.count()
                if count > 0:
                    results = self.collection.query(
                        query_texts=[query_text],
                        n_results=min(n_results, count),
                    )
                    if results and results.get("documents"):
                        return results["documents"][0]
            except Exception as e:
                print(f"ChromaDB query failed, using fallback: {e}")

        # Fallback: simple keyword-based search
        return self._simple_search(query_text, n_results)

    def _simple_search(self, query: str, n_results: int) -> list:
        """Simple keyword-based search fallback when ChromaDB is unavailable."""
        if not self.documents:
            return []

        query_words = set(query.lower().split())
        scored_docs = []

        for i, doc in enumerate(self.documents):
            doc_lower = doc.lower()
            # Score based on keyword overlap
            score = sum(1 for word in query_words if word in doc_lower)
            # Bonus for exact phrase matches
            if query.lower() in doc_lower:
                score += 5
            scored_docs.append((score, i, doc))

        # Sort by score descending
        scored_docs.sort(key=lambda x: x[0], reverse=True)

        # Return top n results with non-zero scores
        results = [doc for score, _, doc in scored_docs[:n_results] if score > 0]
        
        # If no keyword matches, return first n documents as general context
        if not results and self.documents:
            results = self.documents[:n_results]

        return results

    def _chunk_text(self, text: str, chunk_size: int, overlap: int) -> list:
        """
        Split text into overlapping chunks for embedding.
        
        Args:
            text: The full document text
            chunk_size: Maximum characters per chunk
            overlap: Number of overlapping characters between chunks
            
        Returns:
            List of text chunks
        """
        if not text or not text.strip():
            return []

        # Try to split on paragraph boundaries first
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            # If adding this paragraph exceeds chunk_size, save current and start new
            if len(current_chunk) + len(para) + 2 > chunk_size and current_chunk:
                chunks.append(current_chunk.strip())
                # Keep overlap from the end of the current chunk
                if overlap > 0 and len(current_chunk) > overlap:
                    current_chunk = current_chunk[-overlap:] + "\n\n" + para
                else:
                    current_chunk = para
            else:
                if current_chunk:
                    current_chunk += "\n\n" + para
                else:
                    current_chunk = para

        # Don't forget the last chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        # If no paragraphs found, fall back to character-based chunking
        if not chunks:
            for i in range(0, len(text), chunk_size - overlap):
                chunk = text[i:i + chunk_size]
                if chunk.strip():
                    chunks.append(chunk.strip())

        return chunks if chunks else [text.strip()]

    def add_document(self, content: str, metadata: dict = None):
        """
        Add a single document to the knowledge base.
        
        Args:
            content: The document text content
            metadata: Optional metadata dict (source, topic, etc.)
        """
        if not content or not content.strip():
            return

        chunks = self._chunk_text(content, CHUNK_SIZE, CHUNK_OVERLAP)
        source = (metadata or {}).get("source", "manual_entry")

        for i, chunk in enumerate(chunks):
            doc_id = f"{source}_chunk_{i}_{len(self.documents)}"
            chunk_metadata = {
                "source": source,
                "chunk_index": i,
                "total_chunks": len(chunks),
            }
            if metadata:
                chunk_metadata.update(metadata)

            if self.is_available and self.collection is not None:
                try:
                    self.collection.upsert(
                        ids=[doc_id],
                        documents=[chunk],
                        metadatas=[chunk_metadata],
                    )
                except Exception as e:
                    print(f"ChromaDB upsert failed: {e}")

            self.documents.append(chunk)
            self.doc_metadata.append(chunk_metadata)

    def get_stats(self) -> dict:
        """Get statistics about the knowledge base."""
        chroma_count = 0
        if self.is_available and self.collection is not None:
            try:
                chroma_count = self.collection.count()
            except Exception:
                pass

        sources = set()
        for meta in self.doc_metadata:
            sources.add(meta.get("source", "unknown"))

        return {
            "total_chunks": len(self.documents),
            "chroma_chunks": chroma_count,
            "unique_sources": len(sources),
            "sources": list(sources),
            "chroma_available": self.is_available,
        }

    def clear(self):
        """Clear all documents from the knowledge base."""
        self.documents = []
        self.doc_metadata = []
        
        if self.is_available and self.collection is not None:
            try:
                # Delete and recreate the collection
                self.client.delete_collection("course_materials")
                self.collection = self.client.get_or_create_collection(
                    name="course_materials",
                    metadata={"hnsw:space": "cosine"},
                )
            except Exception as e:
                print(f"Failed to clear ChromaDB collection: {e}")
