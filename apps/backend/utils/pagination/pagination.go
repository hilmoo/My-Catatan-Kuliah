package pagination

func GetPagination(page *int, limit *int, defaultLimit int) (int, int, int) {
	actualLimit := defaultLimit
	if limit != nil && *limit > 0 {
		actualLimit = *limit
	}

	actualPage := 1
	if page != nil && *page > 0 {
		actualPage = *page
	}

	offset := (actualPage - 1) * actualLimit
	currentPage := (offset / actualLimit) + 1
	return actualLimit, offset, currentPage
}
