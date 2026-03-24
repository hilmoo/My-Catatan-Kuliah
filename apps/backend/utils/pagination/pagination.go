package pagination

import (
	"backend/utils/uuidx"

	"github.com/google/uuid"
)

func GetPagination(cursorStr *string, limit *int, defaultLimit int) (int, *uuid.UUID) {
	actualLimit := defaultLimit
	if limit != nil && *limit > 0 {
		actualLimit = *limit
	}

	cursor, err := uuidx.FromBase58ToP(*cursorStr)
	if err != nil {
		cursor = nil
	}

	return actualLimit, cursor
}
