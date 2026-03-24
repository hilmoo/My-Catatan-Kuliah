package uuidx

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/ory/herodot"
)

func HttpToBase58(u uuid.UUID, name string) (string, *herodot.DefaultError) {
	val, err := ToBase58(u)
	if err != nil {
		return "", herodot.ErrInternalServerError.
			WithReason("failed to parse " + name).
			WithDebug(err.Error())
	}
	return val, nil
}

func HttpPToBase58(u pgtype.UUID, name string) (*string, *herodot.DefaultError) {
	if !u.Valid {
		return nil, nil
	}

	val, err := ToBase58(uuid.UUID(u.Bytes))
	if err != nil {
		return nil, herodot.ErrInternalServerError.
			WithReason("failed to parse " + name).
			WithDebug(err.Error())
	}
	return &val, nil
}

func HttpFromBase58(s string, name string) (uuid.UUID, *herodot.DefaultError) {
	u, err := FromBase58(s)
	if err != nil {
		return uuid.Nil, herodot.ErrInternalServerError.
			WithReason("invalid " + name).
			WithDebug(err.Error())
	}
	return u, nil
}

func HttpPFromBase58(s *string, name string) (pgtype.UUID, *herodot.DefaultError) {
	if s == nil {
		return pgtype.UUID{}, nil
	}

	u, err := FromBase58ToP(*s)
	if err != nil {
		return pgtype.UUID{}, herodot.ErrInternalServerError.
			WithReason("invalid " + name).
			WithDebug(err.Error())
	}

	return u, nil
}
