-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION hybrid_search(
    query_embedding vector(384),
    query_text text,
    target_workspace_id integer,
    match_count integer DEFAULT 10,
    semantic_weight float DEFAULT 0.5,
    keyword_weight float DEFAULT 0.5,
    rrf_k integer DEFAULT 60
)
RETURNS TABLE (
    id bigint,
    note_id integer,
    course_id integer,
    chunk_index integer,
    content text,
    rrf_score float
)
LANGUAGE sql STABLE AS $$
    WITH semantic_search AS (
        SELECT dc.id, dc.note_id, dc.course_id, dc.chunk_index, dc.content,
               ROW_NUMBER() OVER (ORDER BY dc.embedding <=> query_embedding) AS rank
        FROM document_chunks dc
        WHERE dc.workspace_id = target_workspace_id
        ORDER BY dc.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    keyword_search AS (
        SELECT dc.id, dc.note_id, dc.course_id, dc.chunk_index, dc.content,
               ROW_NUMBER() OVER (ORDER BY ts_rank_cd(dc.fts_vector, websearch_to_tsquery('indonesian', query_text)) DESC) AS rank
        FROM document_chunks dc
        WHERE dc.workspace_id = target_workspace_id
            AND dc.fts_vector @@ websearch_to_tsquery('indonesian', query_text)
        LIMIT match_count * 2
    )
    SELECT
        COALESCE(s.id, k.id) AS id,
        COALESCE(s.note_id, k.note_id) AS note_id,
        COALESCE(s.course_id, k.course_id) AS course_id,
        COALESCE(s.chunk_index, k.chunk_index) AS chunk_index,
        COALESCE(s.content, k.content) AS content,
        (COALESCE(semantic_weight / (rrf_k + s.rank), 0.0) +
         COALESCE(keyword_weight / (rrf_k + k.rank), 0.0))::float AS rrf_score
    FROM semantic_search s
    FULL OUTER JOIN keyword_search k ON s.id = k.id
    ORDER BY rrf_score DESC
    LIMIT match_count;
$$;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP FUNCTION IF EXISTS hybrid_search;
-- +goose StatementEnd
