import sys
import os
import io
import json
import base64

def extract_text(file_path_or_bytes, filename=""):
    lower = filename.lower()
    
    # If path passed as argument
    if isinstance(file_path_or_bytes, str) and os.path.isfile(file_path_or_bytes):
        filename = filename or os.path.basename(file_path_or_bytes)
        lower = filename.lower()
        with open(file_path_or_bytes, "rb") as f:
            content_bytes = f.read()
    else:
        content_bytes = file_path_or_bytes

    if lower.endswith(".pdf"):
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content_bytes))
            pages = []
            for i, p in enumerate(reader.pages):
                txt = p.extract_text()
                if txt:
                    pages.append(f"--- Page {i+1} ---\n{txt}")
            res = "\n".join(pages).strip()
            if res:
                return res
        except Exception as e:
            pass

    if lower.endswith(".docx"):
        try:
            import zipfile
            import xml.etree.ElementTree as ET
            with zipfile.ZipFile(io.BytesIO(content_bytes)) as z:
                xml_content = z.read("word/document.xml")
                tree = ET.fromstring(xml_content)
                namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                text_parts = [node.text for node in tree.findall(".//w:t", namespaces) if node.text]
                res = " ".join(text_parts).strip()
                if res:
                    return res
        except Exception as e:
            pass

    try:
        return content_bytes.decode("utf-8", errors="replace").strip()
    except Exception:
        return ""

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target = sys.argv[1]
        fname = sys.argv[2] if len(sys.argv) > 2 else target
        print(extract_text(target, fname))
    else:
        # Read from stdin
        raw = sys.stdin.read()
        print(extract_text(raw.encode("utf-8"), "stdin.txt"))
