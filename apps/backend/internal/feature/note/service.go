package note

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	msession "backend/internal/transport/middleware/session"
	"backend/internal/utils/uuidx"
	"context"

	"github.com/ory/herodot"
)

type listNotesServiceParams struct {
	queries *db.Queries
	courseIid string
}

func listNotesService(ctx context.Context, args listNotesServiceParams) (models.NotesListResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}
	userIid, err := uuidx.ToBase58(user.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode user ID").WithDebug(err.Error())
	}
	courseIid, err := uuidx.FromBase58(args.courseIid)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReason("invalid course ID").WithDebug(err.Error())
	}

	notes, err := args.queries.ListNotesByUserId(ctx, db.ListNotesByUserIdParams{
		CreatedBy :   user.ID,
		CourseIid: courseIid,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to list notes").WithDebug(err.Error())
	}

	noteModels := make(models.NotesListResponse, 0, len(notes))
	for _, w := range notes {
		id, err := uuidx.ToBase58(w.Iid)
		if err != nil {
			return nil, herodot.ErrInternalServerError.WithReason("failed to encode note id").WithDebug(err.Error())
		}
		courseId, err := uuidx.ToBase58(w.CourseIid)
		if err != nil {
			return nil, herodot.ErrInternalServerError.WithReason("failed to encode course id").WithDebug(err.Error())
		}
		noteModels = append(noteModels, models.NotesResponse{
			CourseId:  courseId,
			CreatedAt: &w.CreatedAt,
			CreatedBy: &userIid,
			Id:        &id,
			Title:     w.Title,
			UpdatedAt: &w.UpdatedAt,
		})
	}

	return noteModels, nil
}

type createNoteServiceParams struct {
	queries *db.Queries
	body    *models.NotesCreateRequest
}

func createNoteService(ctx context.Context, args createNoteServiceParams) (*models.NotesCreateResponse, *herodot.DefaultError) {
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

	note, err := args.queries.CreateNote(ctx, db.CreateNoteParams{
		CourseID:  course.ID,
		Title:     args.body.Title,
		Content:   args.body.Content,
		CreatedBy: user.ID,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to create note").WithDebug(err.Error())
	}

	id, err := uuidx.ToBase58(note.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode note ID").WithDebug(err.Error())
	}

	return &models.NotesCreateResponse{
		CourseId:  args.body.CourseId,
		CreatedAt: &note.CreatedAt,
		CreatedBy: &userIid,
		Id:        &id,
		Title:     note.Title,
		UpdatedAt: &note.UpdatedAt,
	}, nil
}

type deleteNoteServiceParams struct {
	queries *db.Queries
	id      string
}

func deleteNoteService(ctx context.Context, args deleteNoteServiceParams) *herodot.DefaultError {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	noteId, err := uuidx.FromBase58(args.id)
	if err != nil {
		return herodot.ErrBadRequest.WithReason("invalid note ID").WithDebug(err.Error())
	}

	err = args.queries.DeleteNoteByIidAndUser(ctx, db.DeleteNoteByIidAndUserParams{
		Iid:       noteId,
		CreatedBy: user.ID,
	})
	if err != nil {
		return herodot.ErrInternalServerError.WithReason("failed to delete note").WithDebug(err.Error())
	}

	return nil
}

type getNoteDetailsServiceParams struct {
	queries *db.Queries
	id      string
}

func getNoteDetailsService(ctx context.Context, args getNoteDetailsServiceParams) (*models.NotesDetailResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}
	userIid, err := uuidx.ToBase58(user.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode user ID").WithDebug(err.Error())
	}

	noteId, err := uuidx.FromBase58(args.id)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReason("invalid note ID").WithDebug(err.Error())
	}

	note, err := args.queries.GetNoteByIidAndUser(ctx, db.GetNoteByIidAndUserParams{
		Iid:       noteId,
		CreatedBy: user.ID,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to get note details").WithDebug(err.Error())
	}

	id, err := uuidx.ToBase58(note.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode note ID").WithDebug(err.Error())
	}

	courseIid, err := uuidx.ToBase58(note.CourseIid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode course ID").WithDebug(err.Error())
	}

	return &models.NotesDetailResponse{
		Content:   note.Content,
		CourseId:  courseIid,
		CreatedAt: &note.CreatedAt,
		CreatedBy: &userIid,
		Id:        &id,
		Title:     note.Title,
		UpdatedAt: &note.UpdatedAt,
	}, nil

}

type updateNoteServiceParams struct {
	queries *db.Queries
	id      string
	body    *models.NotesUpdateRequest
}

func updateNoteService(ctx context.Context, args updateNoteServiceParams) (*models.NotesUpdateResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}
	userIid, err := uuidx.ToBase58(user.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode user ID").WithDebug(err.Error())
	}

	noteId, err := uuidx.FromBase58(args.id)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReason("invalid note ID").WithDebug(err.Error())
	}

	note, err := args.queries.UpdateNoteByIidAndUser(ctx, db.UpdateNoteByIidAndUserParams{
		Iid:       noteId,
		CreatedBy: user.ID,
		Title:     args.body.Title,
		Content:   args.body.Content,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to update note").WithDebug(err.Error())
	}

	id, err := uuidx.ToBase58(note.Iid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode note ID").WithDebug(err.Error())
	}
	courseIid, err := uuidx.ToBase58(note.CourseIid)
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to encode course ID").WithDebug(err.Error())
	}

	return &models.NotesUpdateResponse{
		Content:   note.Content,
		CourseId:  courseIid,
		CreatedAt: &note.CreatedAt,
		CreatedBy: &userIid,
		Id:        &id,
		Title:     note.Title,
		UpdatedAt: &note.UpdatedAt,
	}, nil
}
