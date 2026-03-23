-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
    RETURNS TRIGGER
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_pages
    BEFORE UPDATE ON "pages"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

CREATE OR REPLACE FUNCTION notify_page_change()
    RETURNS TRIGGER
    AS $$
BEGIN
    PERFORM pg_notify('page_changed', json_build_object('id', COALESCE(NEW.id, OLD.id), 'type', TG_OP)::text);
    RETURN COALESCE(NEW, OLD);
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER trg_page_change
    AFTER INSERT OR UPDATE OR DELETE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION notify_page_change();

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS set_updated_at_pages ON "pages";

DROP FUNCTION IF EXISTS trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_page_change ON "pages";

DROP FUNCTION IF EXISTS notify_page_change();

-- +goose StatementEnd
