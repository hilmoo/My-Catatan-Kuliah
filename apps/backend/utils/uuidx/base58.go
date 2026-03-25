package uuidx

import (
	"github.com/btcsuite/btcutil/base58"
	"github.com/google/uuid"
)

func ToBase58(u uuid.UUID) (string, error) {
	b, err := u.MarshalBinary()
	if err != nil {
		return "", err
	}
	return base58.Encode(b), nil
}

func FromBase58(s string) (uuid.UUID, error) {
	return uuid.FromBytes(base58.Decode(s))
}

func FromBase58ToP(s string) (*uuid.UUID, error) {
	u, err := FromBase58(s)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func PToBase58(u *uuid.UUID) *string {
	if u == nil {
		return nil
	}
	s, err := ToBase58(*u)
	if err != nil {
		return nil
	}
	return &s
}

func PFromBase58(s *string) (*uuid.UUID, error) {
	if s == nil {
		return nil, nil
	}
	return FromBase58ToP(*s)
}
