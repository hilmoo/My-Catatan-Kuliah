package mlog

import (
	"log/slog"
)

const (
	// Log Levels
	DefaultLevel     = slog.LevelDebug
	ClientErrorLevel = slog.LevelWarn
	ServerErrorLevel = slog.LevelError

	// Keys
	TraceIDKey         = "trace_id"
	SpanIDKey          = "span_id"
	RequestIDKey       = "id"
	RequestIDHeaderKey = "X-Request-Id"
)

type customAttributesCtxKeyType struct{}
type requestIDCtxKeyType struct{}
type reqMcpAttributesCtxKeyType struct{}

var (
	customAttributesCtxKey = customAttributesCtxKeyType{}
	requestIDCtxKey        = requestIDCtxKeyType{}
	reqMcpAttributesCtxKey = reqMcpAttributesCtxKeyType{}
)
