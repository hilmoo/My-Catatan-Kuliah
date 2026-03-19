package workspaces

import (
	"backend/internal/gen/models"
	sql "backend/internal/gen/sqlc"
	"backend/internal/transport/validation"

	"github.com/labstack/echo/v5"
)

type WorkspacesHttpHandler struct {
	validate *validation.Vld
	queries  *sql.Queries
}

func NewWorkspacesHttpHandler(vld *validation.Vld, queries *sql.Queries) *WorkspacesHttpHandler {
	return &WorkspacesHttpHandler{
		validate: vld,
		queries:  queries,
	}
}

func (h *WorkspacesHttpHandler) GetWorkspaces(ctx *echo.Context, params models.GetWorkspacesParams) error {
	return nil
}

func (h *WorkspacesHttpHandler) PostWorkspaces(ctx *echo.Context) error {
	return nil
}

func (h *WorkspacesHttpHandler) DeleteWorkspacesWorkspaceId(ctx *echo.Context, workspaceId string) error {
	return nil
}

func (h *WorkspacesHttpHandler) GetWorkspacesWorkspaceId(ctx *echo.Context, workspaceId string) error {
	return nil
}

func (h *WorkspacesHttpHandler) PatchWorkspacesWorkspaceId(ctx *echo.Context, workspaceId string) error {
	return nil
}

func (h *WorkspacesHttpHandler) GetWorkspacesWorkspaceIdCourses(ctx *echo.Context, workspaceId string, params models.GetWorkspacesWorkspaceIdCoursesParams) error {
	return nil
}
