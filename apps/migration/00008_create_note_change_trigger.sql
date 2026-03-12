-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION notify_note_change() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('note_changed', json_build_object(
        'id', COALESCE(NEW.id, OLD.id),
        'type', TG_OP
    )::text);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_note_change
    AFTER INSERT OR UPDATE OR DELETE ON course_notes
    FOR EACH ROW EXECUTE FUNCTION notify_note_change();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS trg_note_change ON course_notes;
DROP FUNCTION IF EXISTS notify_note_change();
-- +goose StatementEnd
