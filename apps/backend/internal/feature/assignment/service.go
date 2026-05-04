package assignment

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	msession "backend/internal/transport/middleware/session"
	"backend/internal/utils/typex"
	"backend/internal/utils/uuidx"
	"context"

	"github.com/ory/herodot"
)

type listAssignmentsServiceParams struct {
	queries *db.Queries
}

func listAssignmentsService(ctx context.Context, args listAssignmentsServiceParams) (models.AssignmentsListResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}
	userIid, err := uuidx.ToBase58(user.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode user ID").WithDebug(err.Error())
	}

	assignments, err := args.queries.ListAssignmentsByUserId(ctx, user.ID)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to list assignments").WithDebug(err.Error())
	}

	assignmentModels := make(models.AssignmentsListResponse, 0, len(assignments))
	for _, w := range assignments {
		id, err := uuidx.ToBase58(w.Iid)
		if err != nil {
			return nil, herodot.ErrInternalServerError.WithReason("failed to encode assignment id").WithDebug(err.Error())
		}
		courseId, err := uuidx.ToBase58(w.CourseIid)
		if err != nil {
			return nil, herodot.ErrInternalServerError.WithReason("failed to encode course id").WithDebug(err.Error())
		}
		assignmentModels = append(assignmentModels, models.AssignmentsResponse{
			CourseId:  courseId,
			CreatedAt: &w.CreatedAt,
			CreatedBy: &userIid,
			Id:        &id,
			Position:  int(w.Position),
			Status:    models.AssignmentsAssignmentStatus(w.Status),
			Title:     w.Title,
			UpdatedAt: &w.UpdatedAt,
		})
	}

	return assignmentModels, nil
}

type createAssignmentServiceParams struct {
	queries *db.Queries
	body    *models.AssignmentsCreateRequest
}

func createAssignmentService(ctx context.Context, args createAssignmentServiceParams) (*models.AssignmentsCreateResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}
	userIid, err := uuidx.ToBase58(user.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode user ID").WithDebug(err.Error())
	}
	courseIid, err := uuidx.FromBase58(args.body.CourseId)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReason("invalid course ID").WithDebug(err.Error())
	}
	course, err := args.queries.GetCourseByIid(ctx, courseIid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to get course").WithDebug(err.Error())
	}

	assignment, err := args.queries.CreateAssignment(ctx, db.CreateAssignmentParams{
		CourseID:  course.ID,
		Title:     args.body.Title,
		Content:   args.body.Content,
		Status:    db.AssignmentStatus(args.body.Status),
		Position:  int32(args.body.Position),
		DueDate:   args.body.DueDate,
		CreatedBy: user.ID,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to create assignment").WithDebug(err.Error())
	}

	id, err := uuidx.ToBase58(assignment.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode assignment ID").WithDebug(err.Error())
	}

	return &models.AssignmentsCreateResponse{
		Content:   assignment.Content,
		CourseId:  args.body.CourseId,
		CreatedAt: &assignment.CreatedAt,
		CreatedBy: &userIid,
		DueDate:   assignment.DueDate,
		Id:        &id,
		Position:  int(assignment.Position),
		Status:    models.AssignmentsAssignmentStatus(assignment.Status),
		Title:     assignment.Title,
		UpdatedAt: &assignment.UpdatedAt,
	}, nil
}

type deleteAssignmentServiceParams struct {
	queries *db.Queries
	id      string
}

func deleteAssignmentService(ctx context.Context, args deleteAssignmentServiceParams) *herodot.DefaultError {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	assignmentId, err := uuidx.FromBase58(args.id)
	if err != nil {
		return herodot.ErrBadRequest.WithReason("invalid assignment ID").WithDebug(err.Error())
	}

	err = args.queries.DeleteAssignmentByIidAndUser(ctx, db.DeleteAssignmentByIidAndUserParams{
		Iid:       assignmentId,
		CreatedBy: user.ID,
	})
	if err != nil {
		return herodot.ErrInternalServerError.WithReason("failed to delete assignment").WithDebug(err.Error())
	}

	return nil
}

type getAssignmentDetailsServiceParams struct {
	queries *db.Queries
	id      string
}

func getAssignmentDetailsService(ctx context.Context, args getAssignmentDetailsServiceParams) (*models.AssignmentsDetailResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}
	userIid, err := uuidx.ToBase58(user.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode user ID").WithDebug(err.Error())
	}

	assignmentId, err := uuidx.FromBase58(args.id)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReason("invalid assignment ID").WithDebug(err.Error())
	}

	assignment, err := args.queries.GetAssignmentByIidAndUser(ctx, db.GetAssignmentByIidAndUserParams{
		Iid:       assignmentId,
		CreatedBy: user.ID,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to get assignment details").WithDebug(err.Error())
	}

	id, err := uuidx.ToBase58(assignment.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode assignment ID").WithDebug(err.Error())
	}

	courseIid, err := uuidx.ToBase58(assignment.CourseIid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode course ID").WithDebug(err.Error())
	}

	return &models.AssignmentsDetailResponse{
		Content:   assignment.Content,
		CourseId:  courseIid,
		CreatedAt: &assignment.CreatedAt,
		CreatedBy: &userIid,
		DueDate:   assignment.DueDate,
		Id:        &id,
		Position:  int(assignment.Position),
		Status:    models.AssignmentsAssignmentStatus(assignment.Status),
		Title:     assignment.Title,
		UpdatedAt: &assignment.UpdatedAt,
	}, nil

}

type updateAssignmentServiceParams struct {
	queries *db.Queries
	id      string
	body    *models.AssignmentsUpdateRequest
}

func updateAssignmentService(ctx context.Context, args updateAssignmentServiceParams) (*models.AssignmentsUpdateResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}
	userIid, err := uuidx.ToBase58(user.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode user ID").WithDebug(err.Error())
	}

	assignmentId, err := uuidx.FromBase58(args.id)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReason("invalid assignment ID").WithDebug(err.Error())
	}

	var status db.NullAssignmentStatus
	if args.body.Status != nil {
		status = db.NullAssignmentStatus{
			AssignmentStatus: db.AssignmentStatus(*args.body.Status),
			Valid:            true,
		}
	} else {
		status = db.NullAssignmentStatus{Valid: false}
	}

	assignment, err := args.queries.UpdateAssignmentByIidAndUser(ctx, db.UpdateAssignmentByIidAndUserParams{
		Iid:       assignmentId,
		CreatedBy: user.ID,
		Title:     args.body.Title,
		Content:   args.body.Content,
		Status:    status,
		Position:  typex.Int32Ptr(*args.body.Position),
		DueDate:   args.body.DueDate,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to update assignment").WithDebug(err.Error())
	}

	id, err := uuidx.ToBase58(assignment.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode assignment ID").WithDebug(err.Error())
	}
	courseIid, err := uuidx.ToBase58(assignment.CourseIid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode course ID").WithDebug(err.Error())
	}

	return &models.AssignmentsUpdateResponse{
		Content:   assignment.Content,
		CourseId:  courseIid,
		CreatedAt: &assignment.CreatedAt,
		CreatedBy: &userIid,
		DueDate:   assignment.DueDate,
		Id:        &id,
		Position:  int(assignment.Position),
		Status:    models.AssignmentsAssignmentStatus(assignment.Status),
		Title:     assignment.Title,
		UpdatedAt: &assignment.UpdatedAt,
	}, nil
}
