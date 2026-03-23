package errort

import (
	mlog "backend/internal/transport/middleware/log"

	"github.com/labstack/echo/v5"
	"github.com/ory/herodot"
)

type HttpErrorResponse struct {
	// The error ID
	//
	// Useful when trying to identify various errors in application logic.
	IDField string `json:"id,omitempty"`

	// A human-readable reason for the error
	//
	// example: User with ID 1234 does not exist.
	ReasonField string `json:"reason,omitempty"`

	// Further error details
	DetailsField map[string]any `json:"details,omitempty"`

	// Already populated by default error
	StatusField string `json:"status,omitempty"`

	// Already populated by default error
	CodeField int `json:"code,omitempty"`

	// Already populated by default error
	ErrorField string `json:"message"`
}

func HttpError(c *echo.Context, err *herodot.DefaultError) error {
	mlog.AddHerodotErrorAttributes(c.Request().Context(), err)

	var details map[string]any
	if len(err.DetailsField) > 0 {
		details = err.DetailsField
	}

	return c.JSON(err.CodeField, HttpErrorResponse{
		IDField:      err.IDField,
		ReasonField:  err.ReasonField,
		DetailsField: details,
		StatusField:  err.StatusField,
		CodeField:    err.CodeField,
		ErrorField:   err.ErrorField,
	})
}
