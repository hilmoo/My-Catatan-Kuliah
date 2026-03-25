package page

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	msession "backend/internal/transport/middleware/session"
	"backend/utils/pagination"
	"backend/utils/uuidx"
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/ory/herodot"
)

type listPagesServiceParams struct {
	queries *db.Queries
	params  *models.ListPagesParams
}

func listPagesService(ctx context.Context, args listPagesServiceParams) (*models.PageListResponse, *herodot.DefaultError) {
	pageType := db.PageType(args.params.Type)

	limit, cursor, err := pagination.GetPagination(args.params.Cursor, args.params.Limit, 20)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReason("invalid pagination cursor").WithDebug(err.Error())
	}
	fetchLimit := limit + 1

	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	var workspaceID *int32
	if args.params.WorkspaceId != nil {
		workspaceIid, errH := uuidx.HttpFromBase58(*args.params.WorkspaceId, "workspace ID")
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
		workspaceID = &workspaceId
	}

	var parentID *int32
	if args.params.ParentId != nil {
		parentIid, errH := uuidx.HttpFromBase58(*args.params.ParentId, "parent ID")
		if errH != nil {
			return nil, errH
		}
		parentId, err := args.queries.GetPageIdByIidAndUser(ctx, db.GetPageIdByIidAndUserParams{
			Iid:       parentIid,
			CreatedBy: user.ID,
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, herodot.ErrNotFound.WithReason("parent not found").WithDebug(err.Error())
			}
			return nil, herodot.ErrInternalServerError.WithReason("failed to get parent").WithDebug(err.Error())
		}
		parentID = &parentId
	}

	Pages, err := args.queries.ListPagesByWorkspaceIdAndType(ctx, db.ListPagesByWorkspaceIdAndTypeParams{
		WorkspaceID: workspaceID,
		ParentID:    parentID,
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
	queries  *db.Queries
	targetId uuid.UUID
}

func getPageDetailsService(ctx context.Context, args getPageDetailsServiceParams) (*models.PageDetailResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	page, err := args.queries.GetPageByIid(ctx, db.GetPageByIidParams{
		Iid:       args.targetId,
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
	queries           *db.Queries
	payload           *models.CreatePageJSONRequestBody
	payloadProperties []byte
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
		if derr, ok := errors.AsType[*herodot.DefaultError](err); ok {
			return nil, derr
		}
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, herodot.ErrNotFound.WithReason("parent page not found").WithDebug(err.Error())
		}
		return nil, herodot.ErrInternalServerError.WithReason("failed to get parent page").WithDebug(err.Error())
	}

	page, err := args.queries.CreatePage(ctx, db.CreatePageParams{
		WorkspaceID: workspaceId,
		ParentID:    parentId,
		Title:       args.payload.Title,
		Icon:        args.payload.Icon,
		Type:        db.PageType(args.payload.Type),
		Properties:  args.payloadProperties,
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
	queries           *db.Queries
	targetId          uuid.UUID
	payload           *models.UpdatePageJSONRequestBody
	userId            int32
	pageType          db.PageType
	payloadProperties []byte
}

func updatePageservice(ctx context.Context, args updatePageserviceParams) (*models.PageDetailResponse, *herodot.DefaultError) {
	var parentId *int32
	parentIid, errH := uuidx.HttpPFromBase58(args.payload.ParentId, "parent ID")
	if errH != nil {
		return nil, errH
	}
	parentId, err := getPageParentId(ctx, getParentIdParams{
		queries:   args.queries,
		pageType:  models.PageCreateType(args.pageType),
		parentIid: parentIid,
		userId:    args.userId,
	})
	if err != nil {
		var derr *herodot.DefaultError
		if errors.As(err, &derr) {
			return nil, derr
		}
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, herodot.ErrNotFound.WithReason("parent page not found").WithDebug(err.Error())
		}
		return nil, herodot.ErrInternalServerError.WithReason("failed to get parent page").WithDebug(err.Error())
	}

	page, err := args.queries.UpdatePage(ctx, db.UpdatePageParams{
		Title:      args.payload.Title,
		ParentID:   parentId,
		Icon:       args.payload.Icon,
		Properties: args.payloadProperties,
		Iid:        args.targetId,
		CreatedBy:  args.userId,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to update page").WithDebug(err.Error())
	}

	return mapDbUpdateToModel(page)
}

type deletePageserviceParams struct {
	queries  *db.Queries
	targetId uuid.UUID
}

func deletePageservice(ctx context.Context, args deletePageserviceParams) *herodot.DefaultError {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	err = args.queries.DeletePage(ctx, db.DeletePageParams{
		Iid:       args.targetId,
		CreatedBy: user.ID,
	})
	if err != nil {
		return herodot.ErrInternalServerError.WithReason("failed to delete page").WithDebug(err.Error())
	}

	return nil
}
