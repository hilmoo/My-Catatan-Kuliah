-- +goose Up
-- +goose StatementBegin
ALTER TABLE files ADD COLUMN width integer;
ALTER TABLE files ADD COLUMN height integer;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE files DROP COLUMN width;
ALTER TABLE files DROP COLUMN height;
-- +goose StatementEnd
