package users

import (
	"backend/internal/gen/models"
	sql "backend/internal/gen/sqlc"
	"backend/internal/transport/validation"

	"github.com/labstack/echo/v5"
)

type UsersHttpHandler struct {
	validate *validation.Vld
	queries  *sql.Queries
}

func NewUsersHttpHandler(vld *validation.Vld, queries *sql.Queries) *UsersHttpHandler {
	return &UsersHttpHandler{
		validate: vld,
		queries:  queries,
	}
}

func (h *UsersHttpHandler) GetUsers(ctx *echo.Context, params models.GetUsersParams) error {
	return nil
}

func (h *UsersHttpHandler) DeleteUsersUserId(ctx *echo.Context, userId string) error {
	return nil
}

func (h *UsersHttpHandler) GetUsersUserId(ctx *echo.Context, userId string) error {
	return nil
}

func (h *UsersHttpHandler) PatchUsersUserId(ctx *echo.Context, userId string) error {
	return nil
}
