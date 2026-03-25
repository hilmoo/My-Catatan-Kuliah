package validation

import (
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
)

type Vld struct {
	Vld *validator.Validate
}

func InitValidation() *Vld {
	vld := validator.New(validator.WithRequiredStructEnabled())

	vld.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	return &Vld{Vld: vld}
}
