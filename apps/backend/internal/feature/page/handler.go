package page

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	errort "backend/internal/transport/error"
	helpert "backend/internal/transport/helper"
	msession "backend/internal/transport/middleware/session"
	"backend/internal/transport/validation"
	"backend/internal/utils/uuidx"
	"errors"
	"net/url"

	"github.com/jackc/pgx/v5"
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
	group := e.Group("/pages")

	group.GET("", h.listPages)
	group.GET("/:id", h.getPageDetails)
	group.POST("", h.createPage)
	group.PATCH("/:id", h.updatePage)
	group.DELETE("/:id", h.deletePage)
	group.Any("/ws/:id", h.proxyHocuspocus)
}

func (h *httpHandler) listPages(c *echo.Context) error {
	params, err := validation.BindValidatePayload[models.ListPagesParams](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := listPagesService(c.Request().Context(), listPagesServiceParams{
		queries: h.queries,
		params:  params,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) getPageDetails(c *echo.Context) error {
	id := c.Param("id")
	targetId, err := uuidx.HttpFromBase58(id, "page ID")
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := getPageDetailsService(c.Request().Context(), getPageDetailsServiceParams{
		queries:  h.queries,
		targetId: targetId,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) createPage(c *echo.Context) error {
	payload, err := validation.BindValidatePayload[models.CreatePageJSONRequestBody](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	var payloadProperties []byte
	payloadProperties, err = httpMarshalValidateProperties(httpMarshalValidatePropertiesParams{
		vld:        h.validate,
		pageType:   db.PageType(payload.Type),
		properties: payload.Properties,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := createPageservice(c.Request().Context(), createPageserviceParams{
		queries:           h.queries,
		payload:           payload,
		payloadProperties: payloadProperties,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(201, resp)
}

func (h *httpHandler) updatePage(c *echo.Context) error {
	id := c.Param("id")
	payload, err := validation.BindValidatePayload[models.UpdatePageJSONRequestBody](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	targetId, err := uuidx.HttpFromBase58(id, "page ID")
	if err != nil {
		return errort.HttpError(c, err)
	}

	user, errs := msession.GetUserFromContext(c.Request().Context())
	if errs != nil {
		return errort.HttpError(c, herodot.ErrUnauthorized.WithReason("user not authenticated").WithDebug(errs.Error()))
	}

	pageType, errs := h.queries.GetPageTypesByIidAndUser(c.Request().Context(), db.GetPageTypesByIidAndUserParams{
		Iid:       targetId,
		CreatedBy: user.ID,
	})
	if errs != nil {
		if errors.Is(errs, pgx.ErrNoRows) {
			return errort.HttpError(c, herodot.ErrNotFound.WithReason("page not found").WithDebug(errs.Error()))
		}
		return errort.HttpError(c, herodot.ErrInternalServerError.WithReason("failed to get page type").WithDebug(errs.Error()))
	}

	var payloadProperties []byte
	payloadProperties, err = httpMarshalValidateProperties(httpMarshalValidatePropertiesParams{
		vld:        h.validate,
		pageType:   db.PageType(pageType),
		properties: payload.Properties,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, err := updatePageservice(c.Request().Context(), updatePageserviceParams{
		queries:           h.queries,
		targetId:          targetId,
		payload:           payload,
		userId:            user.ID,
		pageType:          pageType,
		payloadProperties: payloadProperties,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) deletePage(c *echo.Context) error {
	id := c.Param("id")
	targetId, err := uuidx.HttpFromBase58(id, "page ID")
	if err != nil {
		return errort.HttpError(c, err)
	}

	err = deletePageservice(c.Request().Context(), deletePageserviceParams{
		queries:  h.queries,
		targetId: targetId,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.NoContent(204)
}

func (h *httpHandler) proxyHocuspocus(c *echo.Context) error {
	pageId := c.Param("id")

	targetId, err := uuidx.HttpFromBase58(pageId, "page ID")
	if err != nil {
		return errort.HttpError(c, err)
	}

	user, errs := msession.GetUserFromContext(c.Request().Context())
	if errs != nil {
		return errort.HttpError(c, herodot.ErrUnauthorized.WithReason("user not authenticated").WithDebug(errs.Error()))
	}

	exist, errs := h.queries.ValidatePageIidAndUser(c.Request().Context(), db.ValidatePageIidAndUserParams{
		Iid:       targetId,
		CreatedBy: user.ID,
	})
	if errs != nil {
		if errors.Is(errs, pgx.ErrNoRows) {
			return errort.HttpError(c, herodot.ErrNotFound.WithReason("page not found").WithDebug(errs.Error()))
		}
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
