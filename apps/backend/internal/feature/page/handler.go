package page

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	errort "backend/internal/transport/error"
	helpert "backend/internal/transport/helper"
	msession "backend/internal/transport/middleware/session"
	"backend/internal/transport/validation"
	"backend/utils/uuidx"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/labstack/echo/v5"
	"github.com/ory/herodot"
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
	group := e.Group("/pages")

	group.GET("", h.listAssignments)
	group.GET("/:id", h.getAssignmentDetails)
	group.POST("", h.createAssignment)
	group.PUT("/:id", h.updateAssignment)
	group.DELETE("/:id", h.deleteAssignment)
}

func (h *httpHandler) listAssignments(c *echo.Context) error {
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

func (h *httpHandler) getAssignmentDetails(c *echo.Context) error {
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

func (h *httpHandler) createAssignment(c *echo.Context) error {
	payload, err := validation.BindValidatePayload[models.CreatePageJSONRequestBody](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	payloadProperties, err := httpMarshalValidateProperties(httpMarshalValidatePropertiesParams{
		vld:      h.validate,
		pageType: payload.Type,
		GetProps: func() (any, error) {
			pagetype := db.PageType(payload.Type)
			switch pagetype {
			case db.PageTypeFolder:
				return payload.Properties.AsPagePropertiesFolder()
			case db.PageTypeCourse:
				return payload.Properties.AsPagePropertiesCourse()
			case db.PageTypeNote:
				return payload.Properties.AsPagePropertiesNote()
			case db.PageTypeAssignment:
				return payload.Properties.AsPagePropertiesAssignment()
			default:
				return nil, fmt.Errorf("unsupported page type: %s", payload.Type)
			}
		},
	})

	resp, err := createPageservice(c.Request().Context(), createPageserviceParams{
		queries:           h.queries,
		payload:           payload,
		payloadProperties: payloadProperties,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) updateAssignment(c *echo.Context) error {
	id := c.Param("id")
	payload, err := validation.BindValidatePayload[models.UpdatePageJSONRequestBody](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	targetId, err := uuidx.HttpFromBase58(id, "page ID")
	if err != nil {
		return errort.HttpError(c, err)
	}

	user, _ := msession.GetUserFromContext(c.Request().Context())
	pageType, errs := h.queries.GetPageTypesByIidAndUser(c.Request().Context(), db.GetPageTypesByIidAndUserParams{
		Iid:       targetId,
		CreatedBy: user.ID,
	})
	if errs != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errort.HttpError(c, herodot.ErrNotFound.WithReason("page not found").WithDebug(err.Error()))
		}
		return errort.HttpError(c, herodot.ErrInternalServerError.WithReason("failed to get page type").WithDebug(err.Error()))
	}

	payloadProperties, err := httpMarshalValidateProperties(httpMarshalValidatePropertiesParams{
		vld:      h.validate,
		pageType: models.PageCreateType(pageType),
		GetProps: func() (any, error) {
			pagetype := db.PageType(pageType)
			switch pagetype {
			case db.PageTypeFolder:
				return payload.Properties.AsPagePropertiesFolder()
			case db.PageTypeCourse:
				return payload.Properties.AsPagePropertiesCourse()
			case db.PageTypeNote:
				return payload.Properties.AsPagePropertiesNote()
			case db.PageTypeAssignment:
				return payload.Properties.AsPagePropertiesAssignment()
			default:
				return nil, fmt.Errorf("unsupported page type: %s", pagetype)
			}
		},
	})

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

func (h *httpHandler) deleteAssignment(c *echo.Context) error {
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
