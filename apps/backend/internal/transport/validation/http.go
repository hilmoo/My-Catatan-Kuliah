package validation

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v5"
	"github.com/ory/herodot"
)

func ValidatePayload[T any](v *Vld, payload *T) *herodot.DefaultError {
	return translateValidationError(v.Vld.Struct(payload))
}

func BindValidatePayload[T any](c *echo.Context, v *Vld) (*T, *herodot.DefaultError) {
	payload := new(T)

	if err := c.Bind(payload); err != nil {
		return nil, herodot.ErrBadRequest.WithReason(parseHttpErr(err)).WithID(ValidationErr)
	}

	if hErr := ValidatePayload(v, payload); hErr != nil {
		return nil, hErr
	}

	return payload, nil
}

func translateValidationError(err error) *herodot.DefaultError {
	if err == nil {
		return nil
	}

	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		details := ExtractErrDetail(validationErrors)
		hErr := herodot.ErrBadRequest.
			WithReason("One or more fields contain validation errors").
			WithID(ValidationErr)

		for _, d := range details {
			hErr = hErr.WithDetail(d.Key, d.Detail)
		}
		return hErr
	}

	return herodot.ErrBadRequest.WithReason("invalid request payload").WithID(ValidationErr)
}

func parseHttpErr(err error) string {
	var typeErr *json.UnmarshalTypeError
	if errors.As(err, &typeErr) {
		return fmt.Sprintf("Field '%s' expected type '%s', but got '%s'", typeErr.Field, typeErr.Type, typeErr.Value)
	}

	var syntaxErr *json.SyntaxError
	if errors.As(err, &syntaxErr) {
		return fmt.Sprintf("Request body contains malformed JSON at position %d", syntaxErr.Offset)
	}

	var echoErr *echo.HTTPError
	if errors.As(err, &echoErr) {
		return fmt.Sprintf("%v", echoErr.Message)
	}

	if errors.Is(err, io.EOF) {
		return "Request body cannot be empty"
	}

	return "Invalid request body format"
}
