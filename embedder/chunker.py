from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter


def html_to_plain_text(html: str) -> str:
    """Strip HTML tags and return clean plain text."""
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(separator="\n", strip=True)
    return text


def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> list[str]:
    """Split plain text into overlapping chunks."""
    if not text or not text.strip():
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_text(text)


def process_html_to_chunks(
    html: str, chunk_size: int = 500, chunk_overlap: int = 50
) -> list[str]:
    """Full pipeline: HTML → plain text → chunks."""
    plain_text = html_to_plain_text(html)
    return chunk_text(plain_text, chunk_size, chunk_overlap)
