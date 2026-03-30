package pagination

import (
	"backend/internal/utils/uuidx"

	"github.com/google/uuid"
)

func GetPagination(cursorStr *string, limit *int, defaultLimit int) (int, *uuid.UUID, error) {
	actualLimit := defaultLimit
	if limit != nil && *limit > 0 {
		actualLimit = *limit
	}

	cursor, err := uuidx.PFromBase58(cursorStr)
	if err != nil {
		return 0, nil, err
	}

	return actualLimit, cursor, nil
}
