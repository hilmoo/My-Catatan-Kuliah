package session

import (
	"backend/internal/gen/models"
	"backend/internal/gen/sqlc"
	errort "backend/internal/transport/error"
	"backend/internal/transport/helper"
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
	group := e.Group("/sessions")

	group.GET("", h.listSessions)
	group.GET("/:id", h.getSession)
	group.DELETE("/:id", h.deleteSession)
}

func (h *httpHandler) listSessions(c *echo.Context) error {
	params, err := validation.BindValidatePayload[models.ListSessionsParams](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := listSessionsService(c.Request().Context(), listSessionsServiceParams{
		queries: h.queries,
		params:  params,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) getSession(c *echo.Context) error {
	id := c.Param("id")

	resp, err := getSessionDetailsService(c.Request().Context(), id, h.queries)
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) deleteSession(c *echo.Context) error {
	id := c.Param("id")

	err := deleteSessionService(c.Request().Context(), id, h.queries)
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.NoContent(204)
}
