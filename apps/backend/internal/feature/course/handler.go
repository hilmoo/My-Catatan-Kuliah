package course

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
	group := e.Group("/courses")

	group.GET("", h.listcourses)
	group.POST("", h.createcourse)
	group.GET("/:id", h.getcourseDetails)
	group.PATCH("/:id", h.updatecourse)
	group.DELETE("/:id", h.deletecourse)
}

func (h *httpHandler) listcourses(c *echo.Context) error {
	resp, err := listCoursesService(c.Request().Context(), listCoursesServiceParams{
		queries: h.queries,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) createcourse(c *echo.Context) error {
	body, err := validation.BindValidatePayload[models.CoursesServiceCreateCourseJSONRequestBody](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := createCourseService(c.Request().Context(), createCourseServiceParams{
		queries: h.queries,
		body:    body,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(201, resp)
}

func (h *httpHandler) deletecourse(c *echo.Context) error {
	id := c.Param("id")

	err := deleteCourseService(c.Request().Context(), deleteCourseServiceParams{
		queries: h.queries,
		id:      id,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.NoContent(204)
}

func (h *httpHandler) getcourseDetails(c *echo.Context) error {
	id := c.Param("id")

	resp, err := getCourseDetailsService(c.Request().Context(), getCourseDetailsServiceParams{
		queries: h.queries,
		id:      id,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) updatecourse(c *echo.Context) error {
	id := c.Param("id")

	body, err := validation.BindValidatePayload[models.CoursesServiceUpdateCourseJSONRequestBody](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := updateCourseService(c.Request().Context(), updateCourseServiceParams{
		queries: h.queries,
		id:      id,
		body:    body,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}
