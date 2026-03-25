package health

import "github.com/labstack/echo/v5"

type httpHandler struct{}

func NewHttpHandler() *httpHandler {
	return &httpHandler{}
}

func (h *httpHandler) RegisterRoutes(e *echo.Group) {
	e.GET("/health", h.healthCheck)
}

func (h *httpHandler) healthCheck(c *echo.Context) error {
	return c.NoContent(204)
}
