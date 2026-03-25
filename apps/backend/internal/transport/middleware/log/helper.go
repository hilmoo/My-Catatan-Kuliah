package mlog

import (
	"context"
	"log/slog"
	"sync"

	"github.com/ory/herodot"
)

// GetRequestIDFromContext returns the request identifier from the context.
func GetRequestIDFromContext(ctx context.Context) string {
	if id, ok := ctx.Value(requestIDCtxKey).(string); ok {
		return id
	}
	return ""
}

// AddContextAttributes adds custom attributes to the request context safely.
func AddContextAttributes(ctx context.Context, attrs ...slog.Attr) {
	if v := ctx.Value(customAttributesCtxKey); v != nil {
		if m, ok := v.(*sync.Map); ok {
			for _, attr := range attrs {
				m.Store(attr.Key, attr.Value)
			}
		}
	}
}

// GetContextAttributes retrieves all stored attributes from the context as a slice.
func GetContextAttributes(ctx context.Context) []slog.Attr {
	attrs := []slog.Attr{}

	if v := ctx.Value(customAttributesCtxKey); v != nil {
		if m, ok := v.(*sync.Map); ok {
			// Range calls the function for each key/value pair
			m.Range(func(key, value any) bool {
				k, kOk := key.(string)
				val, vOk := value.(slog.Value)

				if kOk && vOk {
					attrs = append(attrs, slog.Attr{Key: k, Value: val})
				}
				return true // continue iteration
			})
		}
	}

	return attrs
}

func AddHerodotErrorAttributes(ctx context.Context, err *herodot.DefaultError) {
	args := []any{
		slog.String("id", err.IDField),
		slog.String("reason", err.ReasonField),
		slog.Int("code", err.CodeField),
	}

	if err.DebugField != "" {
		args = append(args, slog.String("debug", err.DebugField))
	}
	if len(err.DetailsField) > 0 {
		args = append(args, slog.Any("details", err.DetailsField))
	}

	AddContextAttributes(ctx, slog.Group("error", args...))
}
