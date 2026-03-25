package uuidx

import (
	"github.com/google/uuid"
	"github.com/ory/herodot"
)

func HttpToBase58(u uuid.UUID, name string) (string, *herodot.DefaultError) {
	val, err := ToBase58(u)
	if err != nil {
		return "", herodot.ErrBadRequest.
			WithReason("failed to parse " + name).
			WithDebug(err.Error())
	}
	return val, nil
}

func HttpFromBase58(s string, name string) (uuid.UUID, *herodot.DefaultError) {
	u, err := FromBase58(s)
	if err != nil {
		return uuid.Nil, herodot.ErrBadRequest.
			WithReason("invalid " + name).
			WithDebug(err.Error())
	}
	return u, nil
}

func HttpPFromBase58(s *string, name string) (*uuid.UUID, *herodot.DefaultError) {
	if s == nil {
		return nil, nil
	}

	u, err := FromBase58ToP(*s)
	if err != nil {
		return nil, herodot.ErrBadRequest.
			WithReason("invalid " + name).
			WithDebug(err.Error())
	}

	return u, nil
}
