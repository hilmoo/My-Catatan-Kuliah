package assignments

import (
	"backend/internal/gen/models"
	sql "backend/internal/gen/sqlc"
	"backend/internal/transport/validation"

	"github.com/labstack/echo/v5"
)

type AssignmentHttpHandler struct {
	validate *validation.Vld
	queries  *sql.Queries
}

func NewAssignmentHttpHandler(vld *validation.Vld, queries *sql.Queries) *AssignmentHttpHandler {
	return &AssignmentHttpHandler{
		validate: vld,
		queries:  queries,
	}
}

func (h *AssignmentHttpHandler) GetAssignments(ctx *echo.Context, params models.GetAssignmentsParams) error {
	return nil
}

func (h *AssignmentHttpHandler) PostAssignments(ctx *echo.Context) error {
	return nil
}

func (h *AssignmentHttpHandler) DeleteAssignmentsAssignmentId(ctx *echo.Context, assignmentId string) error {
	return nil
}

func (h *AssignmentHttpHandler) GetAssignmentsAssignmentId(ctx *echo.Context, assignmentId string) error {
	return nil
}

func (h *AssignmentHttpHandler) PatchAssignmentsAssignmentId(ctx *echo.Context, assignmentId string) error {
	return nil
}
