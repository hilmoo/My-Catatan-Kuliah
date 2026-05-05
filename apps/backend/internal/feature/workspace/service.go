package workspace

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	msession "backend/internal/transport/middleware/session"
	"backend/internal/utils/uuidx"
	"context"

	"github.com/ory/herodot"
)

type listWorkspacesServiceParams struct {
	queries *db.Queries
}

func listWorkspacesService(ctx context.Context, args listWorkspacesServiceParams) (models.WorkspacesListResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}
	userIid, err := uuidx.ToBase58(user.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode user ID").WithDebug(err.Error())
	}

	workspaces, err := args.queries.ListWorkspacesByUserId(ctx, user.ID)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to list workspaces").WithDebug(err.Error())
	}

	workspaceModels := make(models.WorkspacesListResponse, 0, len(workspaces))
	for _, w := range workspaces {
		id, err := uuidx.ToBase58(w.Iid)
		if err != nil {
			return nil, herodot.ErrInternalServerError.WithReason("failed to encode workspace id").WithDebug(err.Error())
		}
		workspaceModels = append(workspaceModels, models.WorkspacesResponse{
			Id:        id,
			Name:      w.Name,
			OwnerId:   userIid,
			CreatedAt: w.CreatedAt.String(),
		})
	}

	return workspaceModels, nil
}

type createWorkspaceServiceParams struct {
	queries *db.Queries
	body    *models.WorkspacesCreateRequest
}

func createWorkspaceService(ctx context.Context, args createWorkspaceServiceParams) (*models.WorkspacesResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}
	userIid, err := uuidx.ToBase58(user.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode user ID").WithDebug(err.Error())
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

	return &models.WorkspacesResponse{
		Id:        id,
		Name:      workspace.Name,
		OwnerId:   userIid,
		CreatedAt: workspace.CreatedAt.String(),
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

func getWorkspaceDetailsService(ctx context.Context, args getWorkspaceDetailsServiceParams) (*models.WorkspacesResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}
	userIid, err := uuidx.ToBase58(user.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode user ID").WithDebug(err.Error())
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

	return &models.WorkspacesResponse{
		Id:        id,
		Name:      workspace.Name,
		OwnerId:   userIid,
		CreatedAt: workspace.CreatedAt.String(),
	}, nil

}

type updateWorkspaceServiceParams struct {
	queries *db.Queries
	id      string
	body    *models.WorkspacesUpdateRequest
}

func updateWorkspaceService(ctx context.Context, args updateWorkspaceServiceParams) (*models.WorkspacesResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}
	userIid, err := uuidx.ToBase58(user.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode user ID").WithDebug(err.Error())
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

	return &models.WorkspacesResponse{
		Id:        id,
		Name:      workspace.Name,
		OwnerId:   userIid,
		CreatedAt: workspace.CreatedAt.String(),
	}, nil
}
