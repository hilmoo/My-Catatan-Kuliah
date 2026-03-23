package msession

import (
	"backend/internal/gen/sqlc"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"net/http"
	"time"

	"github.com/labstack/echo/v5"
)

func HashSessionToken(secret, token string) string {
	hashToken := hmac.New(sha256.New, []byte(secret))
	hashToken.Write([]byte(token))
	return base64.URLEncoding.EncodeToString(hashToken.Sum(nil))
}

func GetUserFromContext(ctx context.Context) (*db.User, error) {
	val := ctx.Value(userContextKey)
	if val == nil {
		return nil, errors.New("no authenticated user in context")
	}

	user, ok := val.(*db.User)
	if !ok {
		return nil, errors.New("context value is not of type *db.User")
	}

	return user, nil
}

func SetnewCookies(c *echo.Context, token string) {
	c.SetCookie(&http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

func GetSessionToken(c *echo.Context) (string, error) {
	cookie, err := c.Cookie(sessionCookieName)
	if err != nil {
		return "", err
	}
	return cookie.Value, nil
}

func ClearSessionCookies(c *echo.Context) {
	c.SetCookie(&http.Cookie{
		Name:  sessionCookieName,
		Value: "",
	},
	)
}
