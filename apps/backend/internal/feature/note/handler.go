package note

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	errort "backend/internal/transport/error"
	helpert "backend/internal/transport/helper"
	msession "backend/internal/transport/middleware/session"
	"backend/internal/transport/validation"
	"backend/internal/utils/uuidx"
	"net/url"

	"github.com/labstack/echo/v5"
	"github.com/ory/herodot"
)

type httpHandler struct {
	validate      *validation.Vld
	queries       *db.Queries
	hocuspocusUrl *url.URL
}

func NewHttpHandler(args helpert.HttpHandlerParams) *httpHandler {
	return &httpHandler{
		validate:      args.Validate,
		queries:       args.Queries,
		hocuspocusUrl: args.Config.HocuspocusUrlParsed,
	}
}

func (h *httpHandler) RegisterRoutes(e *echo.Group) {
	group := e.Group("/notes")

	group.GET("/l/:courseIid", h.listnotes)
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

func (h *httpHandler) proxyHocuspocus(c *echo.Context) error {
	pageId := c.Param("id")

	targetId, err := uuidx.HttpFromBase58(pageId, "notes ID")
	if err != nil {
		return errort.HttpError(c, err)
	}

	user, errs := msession.GetUserFromContext(c.Request().Context())
	if errs != nil {
		return errort.HttpError(c, herodot.ErrUnauthorized.WithReason("user not authenticated").WithDebug(errs.Error()))
	}

	exist, errs := h.queries.ValidateNoteAccess(c.Request().Context(), db.ValidateNoteAccessParams{
		Iid:       targetId,
		CreatedBy: user.ID,
	})
	if errs != nil {
		return errort.HttpError(c, herodot.ErrInternalServerError.WithReason("failed to validate page access").WithDebug(errs.Error()))
	}
	if !exist {
		return errort.HttpError(c, herodot.ErrNotFound.WithReason("page not found"))
	}

	proxy, err := proxyHocuspocusService(h.hocuspocusUrl)
	if err != nil {
		return errort.HttpError(c, err)
	}

	proxy.ServeHTTP(c.Response(), c.Request())
	return nil
}
