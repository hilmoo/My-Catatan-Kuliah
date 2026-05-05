package course

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	msession "backend/internal/transport/middleware/session"
	"backend/internal/utils/typex"
	"backend/internal/utils/uuidx"
	"context"

	"github.com/ory/herodot"
)

type listCoursesServiceParams struct {
	queries *db.Queries
}

func listCoursesService(ctx context.Context, args listCoursesServiceParams) (models.CoursesListResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	userIid, err := uuidx.ToBase58(user.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode user ID").WithDebug(err.Error())
	}

	courses, err := args.queries.ListCoursesByUserId(ctx, user.ID)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to list courses").WithDebug(err.Error())
	}

	courseModels := make(models.CoursesListResponse, 0, len(courses))
	for _, w := range courses {
		id, err := uuidx.ToBase58(w.Iid)
		if err != nil {
			return nil, herodot.ErrInternalServerError.WithReason("failed to encode course id").WithDebug(err.Error())
		}
		workspaceId, err := uuidx.ToBase58(w.WorkspaceIid)
		if err != nil {
			return nil, herodot.ErrInternalServerError.WithReason("failed to encode workspace id").WithDebug(err.Error())
		}
		courseModels = append(courseModels, models.CoursesResponse{
			CreatedAt:   &w.CreatedAt,
			CreatedBy:   typex.StringPtr(userIid),
			Credits:     int(w.Credits),
			Id:          &id,
			Instructor:  w.Instructor,
			Title:       w.Title,
			UpdatedAt:   &w.UpdatedAt,
			WorkspaceId: workspaceId,
		})
	}

	return courseModels, nil
}

type createCourseServiceParams struct {
	queries *db.Queries
	body    *models.CoursesCreateRequest
}

func createCourseService(ctx context.Context, args createCourseServiceParams) (*models.CoursesCreateResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}
	userIid, err := uuidx.ToBase58(user.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode user ID").WithDebug(err.Error())
	}
	workspacesIid, err := uuidx.FromBase58(args.body.WorkspaceId)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReason("invalid course ID").WithDebug(err.Error())
	}
	workspace, err := args.queries.GetWorkspaceByIidAndUser(ctx, db.GetWorkspaceByIidAndUserParams{
		Iid:     workspacesIid,
		OwnerID: user.ID,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to get course").WithDebug(err.Error())
	}

	course, err := args.queries.CreateCourse(ctx, db.CreateCourseParams{
		WorkspaceID: workspace.ID,
		Title:       args.body.Title,
		Instructor:  args.body.Instructor,
		Credits:     int32(args.body.Credits),
		CreatedBy:   user.ID,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to create course").WithDebug(err.Error())
	}

	id, err := uuidx.ToBase58(course.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode course ID").WithDebug(err.Error())
	}

	return &models.CoursesCreateResponse{
		CreatedAt:  &course.CreatedAt,
		CreatedBy:  typex.StringPtr(userIid),
		Credits:    int(course.Credits),
		Id:         &id,
		Instructor: course.Instructor,
		Title:      course.Title,
		UpdatedAt:  &course.UpdatedAt,
	}, nil
}

type deleteCourseServiceParams struct {
	queries *db.Queries
	id      string
}

func deleteCourseService(ctx context.Context, args deleteCourseServiceParams) *herodot.DefaultError {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	courseId, err := uuidx.FromBase58(args.id)
	if err != nil {
		return herodot.ErrBadRequest.WithReason("invalid course ID").WithDebug(err.Error())
	}

	err = args.queries.DeleteCourseByIidAndUser(ctx, db.DeleteCourseByIidAndUserParams{
		Iid:       courseId,
		CreatedBy: user.ID,
	})
	if err != nil {
		return herodot.ErrInternalServerError.WithReason("failed to delete course").WithDebug(err.Error())
	}

	return nil
}

type getCourseDetailsServiceParams struct {
	queries *db.Queries
	id      string
}

func getCourseDetailsService(ctx context.Context, args getCourseDetailsServiceParams) (*models.CoursesResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}
	userIid, err := uuidx.ToBase58(user.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode user ID").WithDebug(err.Error())
	}

	courseId, err := uuidx.FromBase58(args.id)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReason("invalid course ID").WithDebug(err.Error())
	}

	course, err := args.queries.GetCourseByIidAndUser(ctx, db.GetCourseByIidAndUserParams{
		Iid:       courseId,
		CreatedBy: user.ID,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to get course details").WithDebug(err.Error())
	}

	id, err := uuidx.ToBase58(course.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode course ID").WithDebug(err.Error())
	}

	workspaceId, err := uuidx.ToBase58(course.WorkspaceIid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode workspace ID").WithDebug(err.Error())
	}

	return &models.CoursesResponse{
		CreatedAt:   &course.CreatedAt,
		CreatedBy:   typex.StringPtr(userIid),
		Credits:     int(course.Credits),
		Id:          &id,
		Instructor:  course.Instructor,
		Title:       course.Title,
		UpdatedAt:   &course.UpdatedAt,
		WorkspaceId: workspaceId,
	}, nil

}

type updateCourseServiceParams struct {
	queries *db.Queries
	id      string
	body    *models.CoursesUpdateRequest
}

func updateCourseService(ctx context.Context, args updateCourseServiceParams) (*models.CoursesResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}
	userIid, err := uuidx.ToBase58(user.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode user ID").WithDebug(err.Error())
	}

	courseId, err := uuidx.FromBase58(args.id)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReason("invalid course ID").WithDebug(err.Error())
	}

	course, err := args.queries.UpdateCourseByIidAndUser(ctx, db.UpdateCourseByIidAndUserParams{
		Iid:        courseId,
		CreatedBy:  user.ID,
		Title:      args.body.Title,
		Instructor: args.body.Instructor,
		Credits:    typex.Int32Ptr(*args.body.Credits),
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to update course").WithDebug(err.Error())
	}

	id, err := uuidx.ToBase58(course.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode course ID").WithDebug(err.Error())
	}
	courseIid, err := uuidx.ToBase58(course.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode course ID").WithDebug(err.Error())
	}

	return &models.CoursesResponse{
		CreatedAt:   &course.CreatedAt,
		CreatedBy:   typex.StringPtr(userIid),
		Credits:     int(course.Credits),
		Id:          &id,
		Instructor:  course.Instructor,
		Title:       course.Title,
		UpdatedAt:   &course.UpdatedAt,
		WorkspaceId: courseIid,
	}, nil
}
