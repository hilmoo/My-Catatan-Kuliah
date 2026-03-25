package mlog

import (
	"context"
	"log/slog"
	"sync"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

type httpMiddleware struct {
	logger *slog.Logger
}

func (m httpMiddleware) EchoMiddleware() echo.MiddlewareFunc {
	requestLoggerConfig := middleware.RequestLoggerConfig{
		LogRequestID:     true,
		LogMethod:        true,
		LogURIPath:       true,
		LogStatus:        true,
		LogLatency:       true,
		LogRemoteIP:      true,
		LogResponseSize:  true,
		LogContentLength: true,
		LogValuesFunc:    m.logValuesFunc,
	}

	loggerMiddleware := middleware.RequestLoggerWithConfig(requestLoggerConfig)

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		loggedHandler := loggerMiddleware(next)

		return func(c *echo.Context) error {
			sharedMap := &sync.Map{}
			ctx := context.WithValue(c.Request().Context(), customAttributesCtxKey, sharedMap)
			c.SetRequest(c.Request().WithContext(ctx))

			return loggedHandler(c)
		}
	}
}

func (m httpMiddleware) logValuesFunc(c *echo.Context, v middleware.RequestLoggerValues) error {
	attrs := []slog.Attr{
		slog.String("request_id", v.RequestID),
		slog.String("method", v.Method),
		slog.String("path", v.URIPath),
		slog.Int("status", v.Status),
		slog.Duration("latency", v.Latency),
		slog.String("remote_ip", v.RemoteIP),
		slog.Int64("response_size", v.ResponseSize),
		slog.String("request_size", v.ContentLength),
	}

	if v := c.Request().Context().Value(customAttributesCtxKey); v != nil {
		v.(*sync.Map).Range(func(key, value any) bool {
			attrs = append(attrs, slog.Attr{Key: key.(string), Value: value.(slog.Value)})
			return true
		})
	}

	slogLevel := DefaultLevel
	if v.Status >= 500 {
		slogLevel = ServerErrorLevel
	} else if v.Status >= 400 {
		slogLevel = ClientErrorLevel
	}

	m.logger.LogAttrs(c.Request().Context(), slogLevel, "http_request", attrs...)

	return nil
}

func New(logger *slog.Logger) httpMiddleware {
	return httpMiddleware{
		logger: logger,
	}
}
