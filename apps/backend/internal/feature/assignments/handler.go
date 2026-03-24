package assignments

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

	group.GET("", h.listAssignments)
	group.GET("/:id", h.getAssignmentDetails)
	group.POST("", h.createAssignment)
	group.PUT("/:id", h.updateAssignment)
	group.DELETE("/:id", h.deleteAssignment)
}

func (h *httpHandler) listAssignments(c *echo.Context) error {
	params, err := validation.BindValidatePayload[models.ListAssignmentsParams](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := listAssignmentsService(c.Request().Context(), listAssignmentsServiceParams{
		queries: h.queries,
		params:  params,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) getAssignmentDetails(c *echo.Context) error {
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

func (h *httpHandler) createAssignment(c *echo.Context) error {
	payload, err := validation.BindValidatePayload[models.CreateAssignmentJSONRequestBody](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := createAssignmentService(c.Request().Context(), createAssignmentServiceParams{
		queries: h.queries,
		payload: payload,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) updateAssignment(c *echo.Context) error {
	id := c.Param("id")
	payload, err := validation.BindValidatePayload[models.UpdateAssignmentJSONRequestBody](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := updateAssignmentService(c.Request().Context(), updateAssignmentServiceParams{
		queries: h.queries,
		id:      id,
		payload: payload,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) deleteAssignment(c *echo.Context) error {
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
