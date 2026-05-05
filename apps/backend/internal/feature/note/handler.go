package note

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
	group := e.Group("/notes")

	group.GET("/:courseIid", h.listnotes)
	group.POST("", h.createnote)
	group.GET("/:id", h.getnoteDetails)
	group.PATCH("/:id", h.updatenote)
	group.DELETE("/:id", h.deletenote)
}

func (h *httpHandler) listnotes(c *echo.Context) error {
	courseIid := c.Param("courseIid")
	resp, err := listNotesService(c.Request().Context(), listNotesServiceParams{
		queries:   h.queries,
		courseIid: courseIid,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) createnote(c *echo.Context) error {
	body, err := validation.BindValidatePayload[models.NotesServiceCreateNoteJSONRequestBody](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := createNoteService(c.Request().Context(), createNoteServiceParams{
		queries: h.queries,
		body:    body,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(201, resp)
}

func (h *httpHandler) deletenote(c *echo.Context) error {
	id := c.Param("id")

	err := deleteNoteService(c.Request().Context(), deleteNoteServiceParams{
		queries: h.queries,
		id:      id,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.NoContent(204)
}

func (h *httpHandler) getnoteDetails(c *echo.Context) error {
	id := c.Param("id")

	resp, err := getNoteDetailsService(c.Request().Context(), getNoteDetailsServiceParams{
		queries: h.queries,
		id:      id,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) updatenote(c *echo.Context) error {
	id := c.Param("id")

	body, err := validation.BindValidatePayload[models.NotesServiceUpdateNoteJSONRequestBody](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := updateNoteService(c.Request().Context(), updateNoteServiceParams{
		queries: h.queries,
		id:      id,
		body:    body,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}
