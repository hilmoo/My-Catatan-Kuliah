package validation

import (
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

type validationErrorDetail struct {
	Key    string
	Detail string
}

func ExtractErrDetail(validationErrors validator.ValidationErrors) []validationErrorDetail {
	details := make([]validationErrorDetail, 0, len(validationErrors))

	for _, ve := range validationErrors {
		fieldName := ve.Field()
		if fieldName != "" {
			details = append(details, validationErrorDetail{
				Key:    fieldName,
				Detail: msgForTag(ve),
			})
		}
	}

	return details
}

func msgForTag(ve validator.FieldError) string {
	switch ve.Tag() {
	case "required":
		return "This field is required"
	case "email":
		return "Must be a valid email address"
	case "url":
		return "Must be a valid URL"
	case "oneof":
		return fmt.Sprintf("Must be one of: %s", strings.ReplaceAll(ve.Param(), " ", ", "))
	case "min":
		return fmt.Sprintf("Must be at least %s characters/items", ve.Param())
	case "max":
		return fmt.Sprintf("Must be at most %s characters/items", ve.Param())
	default:
		return fmt.Sprintf("Failed check for tag '%s'", ve.Tag())
	}
}
