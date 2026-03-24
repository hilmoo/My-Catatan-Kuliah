-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION hybrid_search(
    query_embedding vector(384),
    query_text text,
    target_workspace_id integer,
    match_count integer DEFAULT 10
)
    RETURNS TABLE(
            id bigint,
            page_id integer,
            chunk_index integer,
            content text,
            rrf_score float
)
    LANGUAGE sql
    STABLE
    AS $$
    WITH semantic_search AS(
        SELECT dc.id,
            dc.page_id,
            dc.chunk_index,
            dc.content,
            ROW_NUMBER() OVER(ORDER BY dc.embedding <=> query_embedding) AS rank
        FROM document_chunks dc
        WHERE dc.workspace_id = target_workspace_id
        ORDER BY dc.embedding <=> query_embedding
        LIMIT match_count * 2
),
keyword_search AS(
    SELECT dc.id,
        dc.page_id,
        dc.chunk_index,
        dc.content,
        ROW_NUMBER() OVER(ORDER BY ts_rank_cd(dc.fts_vector, websearch_to_tsquery('indonesian', query_text)) DESC) AS rank
    FROM document_chunks dc
    WHERE dc.workspace_id = target_workspace_id
        AND dc.fts_vector @@ websearch_to_tsquery('indonesian', query_text)
    LIMIT match_count * 2
)
SELECT COALESCE(s.id, k.id) AS id,
    COALESCE(s.page_id, k.page_id) AS page_id,
    COALESCE(s.chunk_index, k.chunk_index) AS chunk_index,
    COALESCE(s.content, k.content) AS content,
(COALESCE(0.5 /(60 + s.rank), 0.0) + COALESCE(0.5 /(60 + k.rank), 0.0))::float AS rrf_score
FROM semantic_search s
    FULL OUTER JOIN keyword_search k ON s.id = k.id
ORDER BY rrf_score DESC
LIMIT match_count;
$$;

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin
DROP FUNCTION IF EXISTS hybrid_search(vector(384), text, integer, integer);

-- +goose StatementEnd
