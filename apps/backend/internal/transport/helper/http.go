package helpert

import (
	db "backend/internal/gen/sqlc"
	"backend/internal/store/config"
	"backend/internal/transport/validation"
)

type HttpHandlerParams struct {
	Validate *validation.Vld
	Queries  *db.Queries
	Config   config.Config
}
