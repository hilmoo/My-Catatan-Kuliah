package workspace

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	errort "backend/internal/transport/error"
	helpert "backend/internal/transport/helper"
	"backend/internal/transport/validation"

	"github.com/labstack/echo/v5"
)

type httpHandler struct {
	validate *validation.Vld
	queries  *db.Queries
}

func NewHttpHandler(args helpert.HttpHandlerParams) *httpHandler {
	return &httpHandler{
		validate: args.Validate,
		queries:  args.Queries,
	}
}

func (h *httpHandler) RegisterRoutes(e *echo.Group) {
	group := e.Group("/workspaces")

	group.GET("", h.listWorkspaces)
	group.POST("", h.createWorkspace)
	group.GET("/:id", h.getWorkspaceDetails)
	group.PUT("/:id", h.updateWorkspace)
	group.DELETE("/:id", h.deleteWorkspace)
}

func (h *httpHandler) listWorkspaces(c *echo.Context) error {
	params, err := validation.BindValidatePayload[models.ListWorkspacesParams](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := listWorkspacesService(c.Request().Context(), listWorkspacesServiceParams{
		queries: h.queries,
		params:  params,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) createWorkspace(c *echo.Context) error {
	body, err := validation.BindValidatePayload[models.CreateWorkspaceJSONRequestBody](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := createWorkspaceService(c.Request().Context(), createWorkspaceServiceParams{
		queries: h.queries,
		body:    body,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) deleteWorkspace(c *echo.Context) error {
	id := c.Param("id")

	err := deleteWorkspaceService(c.Request().Context(), deleteWorkspaceServiceParams{
		queries: h.queries,
		id:      id,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.NoContent(204)
}

func (h *httpHandler) getWorkspaceDetails(c *echo.Context) error {
	id := c.Param("id")

	resp, err := getWorkspaceDetailsService(c.Request().Context(), getWorkspaceDetailsServiceParams{
		queries: h.queries,
		id:      id,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) updateWorkspace(c *echo.Context) error {
	id := c.Param("id")

	body, err := validation.BindValidatePayload[models.UpdateWorkspaceJSONRequestBody](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := updateWorkspaceService(c.Request().Context(), updateWorkspaceServiceParams{
		queries: h.queries,
		id:      id,
		body:    body,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}
