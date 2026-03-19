package auth

import (
	sql "backend/internal/gen/sqlc"
	"backend/internal/transport/validation"

	"github.com/labstack/echo/v5"
)

type AuthHttpHandler struct {
	validate *validation.Vld
	queries  *sql.Queries
}

func NewAuthHttpHandler(vld *validation.Vld, queries *sql.Queries) *AuthHttpHandler {
	return &AuthHttpHandler{
		validate: vld,
		queries:  queries,
	}
}

func (h *AuthHttpHandler) PostAuthLogin(ctx *echo.Context) error {
	return nil
}

func (h *AuthHttpHandler) PostAuthLogout(ctx *echo.Context) error {
	return nil
}

func (h *AuthHttpHandler) GetAuthMe(ctx *echo.Context) error {
	return nil
}

func (h *AuthHttpHandler) PostAuthRegister(ctx *echo.Context) error {
	return nil
}
