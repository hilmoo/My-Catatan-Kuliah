package course_notes

import (
	"backend/internal/gen/models"
	sql "backend/internal/gen/sqlc"
	"backend/internal/transport/validation"

	"github.com/labstack/echo/v5"
)

type CourseNotesHttpHandler struct {
	validate *validation.Vld
	queries  *sql.Queries
}

func NewCourseNotesHttpHandler(vld *validation.Vld, queries *sql.Queries) *CourseNotesHttpHandler {
	return &CourseNotesHttpHandler{
		validate: vld,
		queries:  queries,
	}
}

func (h *CourseNotesHttpHandler) GetNotes(ctx *echo.Context, params models.GetNotesParams) error {
	return nil
}

func (h *CourseNotesHttpHandler) PostNotes(ctx *echo.Context) error {
	return nil
}

func (h *CourseNotesHttpHandler) DeleteNotesNoteId(ctx *echo.Context, noteId string) error {
	return nil
}

func (h *CourseNotesHttpHandler) GetNotesNoteId(ctx *echo.Context, noteId string) error {
	return nil
}

func (h *CourseNotesHttpHandler) PatchNotesNoteId(ctx *echo.Context, noteId string) error {
	return nil
}
