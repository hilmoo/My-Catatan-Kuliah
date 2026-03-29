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

CREATE OR REPLACE FUNCTION check_page_hierarchy()
    RETURNS TRIGGER
    AS $$
DECLARE
    parent_type page_type;
BEGIN
    IF NEW.parent_id IS NULL THEN
        IF NEW.type = 'assignment' THEN
            RAISE EXCEPTION 'Assignments cannot be top-level pages. They must be nested under a course.';
        END IF;
        RETURN NEW;
    END IF;
    SELECT type INTO parent_type
    FROM pages
    WHERE id = NEW.parent_id;
    IF parent_type IS NULL THEN
        RETURN NEW;
    END IF;
    IF parent_type = 'folder' THEN
        -- Folders can hold: folders, courses, notes. (NOT assignments)
        IF NEW.type = 'assignment' THEN
            RAISE EXCEPTION 'Assignments cannot be nested under folders. They must be under courses.';
        END IF;
    ELSIF parent_type = 'course' THEN
        -- Courses can hold: assignments, notes. (NOT folders, courses)
        IF NEW.type IN ('folder', 'course') THEN
            RAISE EXCEPTION '% pages cannot be nested under a course.', NEW.type;
        END IF;
    ELSIF parent_type = 'note' THEN
        -- Notes can hold: notes. (NOT folders, courses, assignments)
        IF NEW.type IN ('folder', 'course', 'assignment') THEN
            RAISE EXCEPTION '% pages cannot be nested under a note.', NEW.type;
        END IF;
    ELSIF parent_type = 'assignment' THEN
        RAISE EXCEPTION 'You cannot nest anything under an assignment.';
    END IF;
    RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER enforce_page_hierarchy_rules
    BEFORE INSERT OR UPDATE OF parent_id,
    type ON pages
    FOR EACH ROW
    EXECUTE FUNCTION check_page_hierarchy();

CREATE OR REPLACE FUNCTION create_empty_pages_content()
    RETURNS TRIGGER
    AS $$
BEGIN
    INSERT INTO pages_content(page_id, content_markdown, content_blob)
        VALUES(NEW.id, NULL, NULL);
    RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER trg_create_empty_pages_content
    AFTER INSERT ON pages
    FOR EACH ROW
    EXECUTE FUNCTION create_empty_pages_content();

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS trg_create_empty_pages_content ON pages;

DROP FUNCTION IF EXISTS create_empty_pages_content();

DROP TRIGGER IF EXISTS enforce_page_hierarchy_rules ON "pages";

DROP FUNCTION IF EXISTS check_page_hierarchy();

DROP TRIGGER IF EXISTS set_updated_at_pages ON "pages";

DROP FUNCTION IF EXISTS trigger_set_updated_at();

-- +goose StatementEnd
