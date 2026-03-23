package auth

import (
	"crypto/rand"
	"encoding/base64"
)

const (
	AlreadAuthenticated = "ALREADY_AUTHENTICATED"
)

func genereateRandomString() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}

	token := base64.URLEncoding.EncodeToString(b)

	return token, nil
}