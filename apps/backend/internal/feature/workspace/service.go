package workspace

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	msession "backend/internal/transport/middleware/session"
	"backend/utils/pagination"
	"backend/utils/uuidx"
	"context"

	"github.com/ory/herodot"
)

type listWorkspacesServiceParams struct {
	queries *db.Queries
	params  *models.ListWorkspacesParams
}

func listWorkspacesService(ctx context.Context, args listWorkspacesServiceParams) (*models.WorkspaceListResponse, *herodot.DefaultError) {
	limit, cursor := pagination.GetPagination(args.params.Cursor, args.params.Limit, 20)
	fetchLimit := limit + 1

	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	workspaces, err := args.queries.ListWorkspacesByUserId(ctx, db.ListWorkspacesByUserIdParams{
		OwnerID: user.ID,
		Limit:   int32(fetchLimit),
		Cursor:  cursor,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to list workspaces").WithDebug(err.Error())
	}

	hasMore := len(workspaces) > limit
	if hasMore {
		workspaces = workspaces[:limit]
	}

	workspaceModels := make([]models.Workspace, 0, len(workspaces))
	for _, w := range workspaces {
		id, err := uuidx.ToBase58(w.Iid)
		if err != nil {
			continue
		}
		workspaceModels = append(workspaceModels, models.Workspace{
			Id:        id,
			Name:      w.Name,
			OwnerId:   "",
			CreatedAt: w.CreatedAt.Time,
		})
	}

	var nextCursor *string
	if len(workspaces) > 0 {
		last := workspaces[len(workspaces)-1]

		id, err := uuidx.ToBase58(last.Iid)
		if err != nil {
			nextCursor = nil
		}

		nextCursor = &id
	}

	pagination := &models.Pagination{
		NextCursor: nextCursor,
		Limit:      &limit,
		HasMore:    &hasMore,
	}

	return &models.WorkspaceListResponse{
		Data:       &workspaceModels,
		Pagination: pagination,
	}, nil
}

type createWorkspaceServiceParams struct {
	queries *db.Queries
	body    *models.CreateWorkspaceJSONRequestBody
}

func createWorkspaceService(ctx context.Context, args createWorkspaceServiceParams) (*models.WorkspaceDetailResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	workspace, err := args.queries.CreateWorkspace(ctx, db.CreateWorkspaceParams{
		Name:    args.body.Name,
		OwnerID: user.ID,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to create workspace").WithDebug(err.Error())
	}

	id, err := uuidx.ToBase58(workspace.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode workspace ID").WithDebug(err.Error())
	}

	return &models.WorkspaceDetailResponse{
		Id:        id,
		Name:      workspace.Name,
		OwnerId:   "",
		CreatedAt: workspace.CreatedAt.Time,
	}, nil
}

type deleteWorkspaceServiceParams struct {
	queries *db.Queries
	id      string
}

func deleteWorkspaceService(ctx context.Context, args deleteWorkspaceServiceParams) *herodot.DefaultError {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	workspaceId, err := uuidx.FromBase58(args.id)
	if err != nil {
		return herodot.ErrBadRequest.WithReason("invalid workspace ID").WithDebug(err.Error())
	}

	err = args.queries.DeleteWorkspaceByIidAndUser(ctx, db.DeleteWorkspaceByIidAndUserParams{
		Iid:     workspaceId,
		OwnerID: user.ID,
	})
	if err != nil {
		return herodot.ErrInternalServerError.WithReason("failed to delete workspace").WithDebug(err.Error())
	}

	return nil
}

type getWorkspaceDetailsServiceParams struct {
	queries *db.Queries
	id      string
}

func getWorkspaceDetailsService(ctx context.Context, args getWorkspaceDetailsServiceParams) (*models.WorkspaceDetailResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	workspaceId, err := uuidx.FromBase58(args.id)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReason("invalid workspace ID").WithDebug(err.Error())
	}

	workspace, err := args.queries.GetWorkspaceByIidAndUser(ctx, db.GetWorkspaceByIidAndUserParams{
		Iid:     workspaceId,
		OwnerID: user.ID,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to get workspace details").WithDebug(err.Error())
	}

	id, err := uuidx.ToBase58(workspace.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode workspace ID").WithDebug(err.Error())
	}

	return &models.WorkspaceDetailResponse{
		Id:        id,
		Name:      workspace.Name,
		OwnerId:   "",
		CreatedAt: workspace.CreatedAt.Time,
	}, nil

}

type updateWorkspaceServiceParams struct {
	queries *db.Queries
	id      string
	body    *models.UpdateWorkspaceJSONRequestBody
}

func updateWorkspaceService(ctx context.Context, args updateWorkspaceServiceParams) (*models.WorkspaceDetailResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	workspaceId, err := uuidx.FromBase58(args.id)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReason("invalid workspace ID").WithDebug(err.Error())
	}

	workspace, err := args.queries.UpdateWorkspaceByIidAndUser(ctx, db.UpdateWorkspaceByIidAndUserParams{
		Iid:     workspaceId,
		OwnerID: user.ID,
		Name:    &args.body.Name,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to update workspace").WithDebug(err.Error())
	}

	id, err := uuidx.ToBase58(workspace.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode workspace ID").WithDebug(err.Error())
	}

	return &models.WorkspaceDetailResponse{
		Id:        id,
		Name:      workspace.Name,
		OwnerId:   "",
		CreatedAt: workspace.CreatedAt.Time,
	}, nil
}
