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
