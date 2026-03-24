package assignments

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	msession "backend/internal/transport/middleware/session"
	"backend/utils/pagination"
	"backend/utils/uuidx"
	"context"
	"encoding/json"

	"github.com/ory/herodot"
)

type listAssignmentsServiceParams struct {
	queries     *db.Queries
	workspaceId int
	params      *models.ListAssignmentsParams
}

func listAssignmentsService(ctx context.Context, args listAssignmentsServiceParams) (*models.AssignmentListResponse, *herodot.DefaultError) {
	limit, cursor := pagination.GetPagination(args.params.Cursor, args.params.Limit, 20)
	fetchLimit := limit + 1

	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	assignments, err := args.queries.ListAssignmentPagesByWorkspaceId(ctx, db.ListAssignmentPagesByWorkspaceIdParams{
		CreatedBy:   user.ID,
		WorkspaceID: int32(args.workspaceId),
		Limit:       int32(fetchLimit),
		Cursor:      cursor,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to list assignments").WithDebug(err.Error())
	}

	hasMore := len(assignments) > limit
	if hasMore {
		assignments = assignments[:limit]
	}

	assignmentModels := make([]models.Assignment, 0, len(assignments))
	for _, a := range assignments {
		as, err := mapAssignmentListToModel(a)
		if err != nil {
			return nil, err
		}

		assignmentModels = append(assignmentModels, *as)
	}

	var nextCursor *string
	if len(assignments) > 0 {
		last := assignments[len(assignments)-1]

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

	return &models.AssignmentListResponse{
		Data:       &assignmentModels,
		Pagination: pagination,
	}, nil
}

type getAssignmentDetailsServiceParams struct {
	queries *db.Queries
	id      string
}

func getAssignmentDetailsService(ctx context.Context, args getAssignmentDetailsServiceParams) (*models.Assignment, *herodot.DefaultError) {
	assignmentId, err := uuidx.FromBase58(args.id)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReason("invalid assignment ID").WithDebug(err.Error())
	}

	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	assignment, err := args.queries.GetAssignmentPageByIid(ctx, db.GetAssignmentPageByIidParams{
		Iid:       assignmentId,
		CreatedBy: user.ID,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to get assignment details").WithDebug(err.Error())
	}

	return mapAssignmentGetToModel(assignment)
}

type createAssignmentServiceParams struct {
	queries *db.Queries
	payload *models.CreateAssignmentJSONRequestBody
}

func createAssignmentService(ctx context.Context, args createAssignmentServiceParams) (*models.Assignment, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	workspaceId, errH := uuidx.HttpFromBase58(args.payload.WorkspaceId, "workspace ID")
	if errH != nil {
		return nil, errH
	}

	parentId, errH := uuidx.HttpPFromBase58(args.payload.ParentId, "parent ID")
	if errH != nil {
		return nil, errH
	}

	var properties []byte
	if args.payload.Properties != nil {
		properties, err = json.Marshal(args.payload.Properties)
		if err != nil {
			return nil, herodot.ErrBadRequest.WithReason("invalid properties").WithDebug(err.Error())
		}
	}

	assignment, err := args.queries.CreateAssignmentPage(ctx, db.CreateAssignmentPageParams{
		WorkspaceIid: workspaceId,
		ParentIid:    parentId,
		Title:        args.payload.Title,
		Icon:         args.payload.Icon,
		Properties:   json.RawMessage(properties),
		CreatedByID:  user.ID,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to create assignment").WithDebug(err.Error())
	}

	return mapAssignmentCreateToModel(assignment)
}

type updateAssignmentServiceParams struct {
	queries *db.Queries
	id      string
	payload *models.UpdateAssignmentJSONRequestBody
}

func updateAssignmentService(ctx context.Context, args updateAssignmentServiceParams) (*models.Assignment, *herodot.DefaultError) {
	targetId, errH := uuidx.HttpFromBase58(args.id, "assignment ID")
	if errH != nil {
		return nil, errH
	}

	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	parentId, errH := uuidx.HttpPFromBase58(args.payload.ParentId, "parent ID")
	if errH != nil {
		return nil, errH
	}

	var properties []byte
	if args.payload.Properties != nil {
		properties, err = json.Marshal(args.payload.Properties)
		if err != nil {
			return nil, herodot.ErrBadRequest.WithReason("invalid properties").WithDebug(err.Error())
		}
	}

	assignment, err := args.queries.UpdateAssignmentPage(ctx, db.UpdateAssignmentPageParams{
		Title:      args.payload.Title,
		ParentIid:  parentId,
		Icon:       args.payload.Icon,
		Properties: json.RawMessage(properties),
		Iid:        targetId,
		CreatedBy:  user.ID,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to update assignment").WithDebug(err.Error())
	}

	return mapAssignmentUpdateToModel(assignment)
}

type deleteAssignmentServiceParams struct {
	queries *db.Queries
	id      string
}

func deleteAssignmentService(ctx context.Context, args deleteAssignmentServiceParams) *herodot.DefaultError {
	targetId, errH := uuidx.HttpFromBase58(args.id, "assignment ID")
	if errH != nil {
		return errH
	}

	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	err = args.queries.DeleteAssignmentPage(ctx, db.DeleteAssignmentPageParams{
		Iid:       targetId,
		CreatedBy: user.ID,
	})
	if err != nil {
		return herodot.ErrInternalServerError.WithReason("failed to delete assignment").WithDebug(err.Error())
	}

	return nil
}
