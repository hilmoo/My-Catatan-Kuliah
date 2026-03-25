package auth

import (
	"crypto/rand"
	"encoding/base64"
)

const (
	AlreadyAuthenticated = "ALREADY_AUTHENTICATED"
)

func generateRandomString() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}

	token := base64.URLEncoding.EncodeToString(b)

	return token, nil
}
