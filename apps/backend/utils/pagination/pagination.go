package pagination

import (
	"backend/utils/uuidx"

	"github.com/jackc/pgx/v5/pgtype"
)

func GetPagination(cursorStr *string, limit *int, defaultLimit int) (int, pgtype.UUID) {
	actualLimit := defaultLimit
	if limit != nil && *limit > 0 {
		actualLimit = *limit
	}

	cursor, err := uuidx.FromBase58ToP(*cursorStr)
	if err != nil {
		cursor = pgtype.UUID{Valid: false}
	}

	return actualLimit, cursor
}
