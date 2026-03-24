package page

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	msession "backend/internal/transport/middleware/session"
	"backend/utils/pagination"
	"backend/utils/uuidx"
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/ory/herodot"
)

type listPagesServiceParams struct {
	queries *db.Queries
	params  *models.ListPagesParams
}

func listPagesService(ctx context.Context, args listPagesServiceParams) (*models.PageListResponse, *herodot.DefaultError) {
	pageType := db.PageTypeFolder
	if args.params.Type != nil {
		pageType = db.PageType(*args.params.Type)
	}

	limit, cursor := pagination.GetPagination(args.params.Cursor, args.params.Limit, 20)
	fetchLimit := limit + 1

	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	var workspaceId int32
	if args.params.WorkspaceId != nil {
		workspaceIid, errH := uuidx.HttpFromBase58(*args.params.WorkspaceId, "workspace ID")
		if errH != nil {
			return nil, errH
		}
		workspaceId, err = args.queries.GetWorkspaceIdByIidAndUser(ctx, db.GetWorkspaceIdByIidAndUserParams{
			Iid:     workspaceIid,
			OwnerID: user.ID,
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, herodot.ErrNotFound.WithReason("workspace not found").WithDebug(err.Error())
			}
			return nil, herodot.ErrInternalServerError.WithReason("failed to get workspace").WithDebug(err.Error())
		}
	}

	Pages, err := args.queries.ListPagesByWorkspaceIdAndType(ctx, db.ListPagesByWorkspaceIdAndTypeParams{
		WorkspaceID: workspaceId,
		Type:        pageType,
		CreatedBy:   user.ID,
		Limit:       int32(fetchLimit),
		Cursor:      cursor,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to list Pages").WithDebug(err.Error())
	}

	hasMore := len(Pages) > limit
	if hasMore {
		Pages = Pages[:limit]
	}

	pageModels := make([]models.PageDetail, 0, len(Pages))
	for _, a := range Pages {
		pg, err := mapDbListToModel(a)
		if err != nil {
			return nil, err
		}

		pageModels = append(pageModels, *pg)
	}

	var nextCursor *string
	if n := len(Pages); n > 0 {
		last := Pages[n-1]

		id, err := uuidx.ToBase58(last.Iid)
		if err != nil {
			return nil, herodot.ErrInternalServerError.WithReason("failed to encode cursor").WithDebug(err.Error())
		}
		nextCursor = &id
	}

	pageInfo := &models.Pagination{
		NextCursor: nextCursor,
		Limit:      &limit,
		HasMore:    &hasMore,
	}

	return &models.PageListResponse{
		Data:       &pageModels,
		Pagination: pageInfo,
	}, nil
}

type getPageDetailsServiceParams struct {
	queries *db.Queries
	id      string
}

func getPageDetailsService(ctx context.Context, args getPageDetailsServiceParams) (*models.PageDetailResponse, *herodot.DefaultError) {
	pageId, errH := uuidx.HttpFromBase58(args.id, "page ID")
	if errH != nil {
		return nil, errH
	}

	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	page, err := args.queries.GetPageByIid(ctx, db.GetPageByIidParams{
		Iid:       pageId,
		CreatedBy: user.ID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, herodot.ErrNotFound.WithReason("page not found").WithDebug(err.Error())
		}
		return nil, herodot.ErrInternalServerError.WithReason("failed to get page details").WithDebug(err.Error())
	}

	return mapDbDetailsToModel(page)
}

type createPageserviceParams struct {
	queries *db.Queries
	payload *models.CreatePageJSONRequestBody
}

func createPageservice(ctx context.Context, args createPageserviceParams) (*models.PageDetailResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	workspaceIid, errH := uuidx.HttpFromBase58(args.payload.WorkspaceId, "workspace ID")
	if errH != nil {
		return nil, errH
	}
	workspaceId, err := args.queries.GetWorkspaceIdByIidAndUser(ctx, db.GetWorkspaceIdByIidAndUserParams{
		Iid:     workspaceIid,
		OwnerID: user.ID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, herodot.ErrNotFound.WithReason("workspace not found").WithDebug(err.Error())
		}
		return nil, herodot.ErrInternalServerError.WithReason("failed to get workspace").WithDebug(err.Error())
	}

	var parentId *int32
	parentIid, errH := uuidx.HttpPFromBase58(args.payload.ParentId, "parent ID")
	if errH != nil {
		return nil, errH
	}
	parentId, err = getPageParentId(ctx, getParentIdParams{
		queries:   args.queries,
		pageType:  args.payload.Type,
		parentIid: parentIid,
		userId:    user.ID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, herodot.ErrNotFound.WithReason("parent page not found").WithDebug(err.Error())
		}
		return nil, herodot.ErrInternalServerError.WithReason("failed to get parent page").WithDebug(err.Error())
	}

	properties, err := args.payload.Properties.MarshalJSON()
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReason("invalid properties").WithDebug(err.Error())
	}

	page, err := args.queries.CreatePage(ctx, db.CreatePageParams{
		WorkspaceID: workspaceId,
		ParentID:    parentId,
		Title:       args.payload.Title,
		Icon:        args.payload.Icon,
		Type:        db.PageType(args.payload.Type),
		Properties:  json.RawMessage(properties),
		CreatedByID: user.ID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, herodot.ErrNotFound.WithReason("page not found").WithDebug(err.Error())
		}
		return nil, herodot.ErrInternalServerError.WithReason("failed to create page").WithDebug(err.Error())
	}

	return mapDbCreateToModel(page)
}

type updatePageserviceParams struct {
	queries *db.Queries
	id      string
	payload *models.UpdatePageJSONRequestBody
}

func updatePageservice(ctx context.Context, args updatePageserviceParams) (*models.PageDetailResponse, *herodot.DefaultError) {
	targetId, errH := uuidx.HttpFromBase58(args.id, "page ID")
	if errH != nil {
		return nil, errH
	}

	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	pageType, err := args.queries.GetPageTypesByIidAndUser(ctx, db.GetPageTypesByIidAndUserParams{
		Iid:       targetId,
		CreatedBy: user.ID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, herodot.ErrNotFound.WithReason("page not found").WithDebug(err.Error())
		}
		return nil, herodot.ErrInternalServerError.WithReason("failed to get page type").WithDebug(err.Error())
	}

	var parentId *int32
	parentIid, errH := uuidx.HttpPFromBase58(args.payload.ParentId, "parent ID")
	if errH != nil {
		return nil, errH
	}
	parentId, err = getPageParentId(ctx, getParentIdParams{
		queries:   args.queries,
		pageType:  models.PageCreateType(pageType),
		parentIid: parentIid,
		userId:    user.ID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, herodot.ErrNotFound.WithReason("parent page not found").WithDebug(err.Error())
		}
		return nil, herodot.ErrInternalServerError.WithReason("failed to get parent page").WithDebug(err.Error())
	}

	properties, err := args.payload.Properties.MarshalJSON()
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReason("invalid properties").WithDebug(err.Error())
	}

	page, err := args.queries.UpdatePage(ctx, db.UpdatePageParams{
		Title:      args.payload.Title,
		ParentID:   parentId,
		Icon:       args.payload.Icon,
		Properties: json.RawMessage(properties),
		Iid:        targetId,
		CreatedBy:  user.ID,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to update page").WithDebug(err.Error())
	}

	return mapDbUpdateToModel(page)
}

type deletePageserviceParams struct {
	queries *db.Queries
	id      string
}

func deletePageservice(ctx context.Context, args deletePageserviceParams) *herodot.DefaultError {
	targetId, errH := uuidx.HttpFromBase58(args.id, "page ID")
	if errH != nil {
		return errH
	}

	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	err = args.queries.DeletePage(ctx, db.DeletePageParams{
		Iid:       targetId,
		CreatedBy: user.ID,
	})
	if err != nil {
		return herodot.ErrInternalServerError.WithReason("failed to delete page").WithDebug(err.Error())
	}

	return nil
}
