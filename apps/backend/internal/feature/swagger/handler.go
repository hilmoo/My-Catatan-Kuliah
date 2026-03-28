package swagger

import (
	api "backend/internal/gen/server"
	errort "backend/internal/transport/error"
	"net/http"

	"github.com/labstack/echo/v5"
	"github.com/ory/herodot"
)

type httpHandler struct{}

func NewHttpHandler() *httpHandler {
	return &httpHandler{}
}

func (h *httpHandler) RegisterRoutes(e *echo.Group) {
	e.GET("/swagger.json", h.swaggerJson)
}

func (h *httpHandler) swaggerJson(c *echo.Context) error {
	specMap := api.PathToRawSpec("swagger.json")
	if fn, ok := specMap["swagger.json"]; ok {
		data, err := fn()
		if err != nil {
			return errort.HttpError(c, herodot.ErrInternalServerError.WithReason("failed to load swagger spec").WithDebug(err.Error()))
		}
		return c.Blob(http.StatusOK, "application/json", data)
	}
	return errort.HttpError(c, herodot.ErrNotFound.WithReason("swagger spec not found"))
}
