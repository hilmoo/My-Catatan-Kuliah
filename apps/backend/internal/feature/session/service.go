package session

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	msession "backend/internal/transport/middleware/session"
	"backend/utils/pagination"
	"backend/utils/uuidx"
	"context"

	"github.com/google/uuid"
	"github.com/ory/herodot"
)

type listSessionsServiceParams struct {
	queries *db.Queries
	params  *models.ListSessionsParams
}

func listSessionsService(ctx context.Context, args listSessionsServiceParams) (*models.SessionListResponse, *herodot.DefaultError) {
	limit, cursor := pagination.GetPagination(args.params.Cursor, args.params.Limit, 20)
	fetchLimit := limit + 1

	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	sessions, err := args.queries.ListSessionsByUserId(ctx, db.ListSessionsByUserIdParams{
		UserID: user.ID,
		Limit:  int32(fetchLimit),
		Cursor: cursor,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to list sessions").WithDebug(err.Error())
	}

	hasMore := len(sessions) > limit
	if hasMore {
		sessions = sessions[:limit]
	}

	sessionModels := make([]models.Session, 0, len(sessions))
	for _, s := range sessions {
		sessionModels = append(sessionModels, models.Session{
			Id:        s.ID.String(),
			UserId:    user.Iid.String(),
			ExpiresAt: s.ExpiresAt,
			IpAddress: s.IpAddress,
			UserAgent: s.UserAgent,
			CreatedAt: s.CreatedAt,
		})
	}

	var nextCursor *string
	if n := len(sessions); n > 0 {
		last := sessions[n-1]

		id, err := uuidx.ToBase58(last.ID)
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

	return &models.SessionListResponse{
		Data:       &sessionModels,
		Pagination: pageInfo,
	}, nil
}

func getSessionDetailsService(ctx context.Context, sessionIdStr string, queries *db.Queries) (*models.SessionDetailResponse, *herodot.DefaultError) {
	sessionId, err := uuid.Parse(sessionIdStr)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReason("invalid session ID").WithDebug(err.Error())
	}

	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	session, err := queries.GetSessionById(ctx, db.GetSessionByIdParams{
		ID:     sessionId,
		UserID: user.ID,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to get session details").WithDebug(err.Error())
	}

	return &models.SessionDetailResponse{
		Id:        session.ID.String(),
		ExpiresAt: session.ExpiresAt,
		IpAddress: session.IpAddress,
		UserAgent: session.UserAgent,
		CreatedAt: session.CreatedAt,
	}, nil
}

func deleteSessionService(ctx context.Context, sessionIdStr string, queries *db.Queries) *herodot.DefaultError {
	sessionId, err := uuid.Parse(sessionIdStr)
	if err != nil {
		return herodot.ErrBadRequest.WithReason("invalid session ID").WithDebug(err.Error())
	}

	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	err = queries.DeleteSessionById(ctx, db.DeleteSessionByIdParams{
		ID:     sessionId,
		UserID: user.ID,
	})
	if err != nil {
		return herodot.ErrInternalServerError.WithReason("failed to delete session").WithDebug(err.Error())
	}

	return nil
}
