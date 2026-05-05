package assignment

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
	group := e.Group("/assignments")

	group.GET("/:courseIid", h.listassignments)
	group.POST("", h.createassignment)
	group.GET("/:id", h.getassignmentDetails)
	group.PATCH("/:id", h.updateassignment)
	group.DELETE("/:id", h.deleteassignment)
}

func (h *httpHandler) listassignments(c *echo.Context) error {
	courseIid := c.Param("courseIid")
	resp, err := listAssignmentsService(c.Request().Context(), listAssignmentsServiceParams{
		queries:   h.queries,
		courseIid: courseIid,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) createassignment(c *echo.Context) error {
	body, err := validation.BindValidatePayload[models.AssignmentsServiceCreateAssignmentJSONRequestBody](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := createAssignmentService(c.Request().Context(), createAssignmentServiceParams{
		queries: h.queries,
		body:    body,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(201, resp)
}

func (h *httpHandler) deleteassignment(c *echo.Context) error {
	id := c.Param("id")

	err := deleteAssignmentService(c.Request().Context(), deleteAssignmentServiceParams{
		queries: h.queries,
		id:      id,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.NoContent(204)
}

func (h *httpHandler) getassignmentDetails(c *echo.Context) error {
	id := c.Param("id")

	resp, err := getAssignmentDetailsService(c.Request().Context(), getAssignmentDetailsServiceParams{
		queries: h.queries,
		id:      id,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) updateassignment(c *echo.Context) error {
	id := c.Param("id")

	body, err := validation.BindValidatePayload[models.AssignmentsServiceUpdateAssignmentJSONRequestBody](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := updateAssignmentService(c.Request().Context(), updateAssignmentServiceParams{
		queries: h.queries,
		id:      id,
		body:    body,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}
