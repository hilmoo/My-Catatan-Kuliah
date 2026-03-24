package uuidx

import (
	"github.com/btcsuite/btcutil/base58"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
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

func FromBase58ToP(s string) (pgtype.UUID, error) {
	u, err := FromBase58(s)
	if err != nil {
		return pgtype.UUID{}, err
	}

	var p pgtype.UUID
	err = p.Scan(u)
	if err != nil {
		return pgtype.UUID{}, err
	}

	return p, nil
}

func PToBase58(u pgtype.UUID) (*string) {
	if !u.Valid {
		return nil
	}

	s := base58.Encode(u.Bytes[:])
	return &s
}
