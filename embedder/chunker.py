from bs4 import Tag
from langchain_text_splitters import HTMLSemanticPreservingSplitter


def li_handler(tag: Tag) -> str:
    """format list: number for <ol> and bullet (dash -) for <ul>"""
    parent = tag.parent
    if parent and parent.name == "ol":
        index = list(parent.find_all("li")).index(tag) + 1
        return f" \n{index}. {tag.get_text().strip()} "
    return f" \n- {tag.get_text().strip()} "


def process_html_to_chunks(
    html: str,
    chunk_size: int = 500,
    chunk_overlap: int = 50,  # noqa: ARG001
) -> list[str]:
    """Split HTML into semantic chunks, preserving lists and tables."""
    if not html or not html.strip():
        return []

    splitter = HTMLSemanticPreservingSplitter(
        headers_to_split_on=[
            ("h1", "Header 1"),
            ("h2", "Header 2"),
            ("h3", "Header 3"),
        ],
        max_chunk_size=chunk_size,
        separators=["\n\n", "\n", ". ", " "],
        elements_to_preserve=["table", "ul", "ol"],
        custom_handlers={"li": li_handler},
    )

    docs = splitter.split_text(html)
    return [doc.page_content for doc in docs if doc.page_content.strip()]
