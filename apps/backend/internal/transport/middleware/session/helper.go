package msession

import (
	db "backend/internal/gen/sqlc"

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

func GetUserFromContext(ctx context.Context) (db.User, error) {
	val := ctx.Value(userContextKey)
	if val == nil {
		return db.User{}, errors.New("no authenticated user in context")
	}

	user, ok := val.(db.User)
	if !ok {
		return db.User{}, errors.New("context value is not of type db.User")
	}

	return user, nil
}

func GetSessionToken(c *echo.Context) (string, error) {
	cookie, err := c.Cookie(sessionCookieName)
	if err != nil {
		return "", err
	}
	return cookie.Value, nil
}

func cookieTemplate(isProd bool) *http.Cookie {
	return &http.Cookie{
		Name:     sessionCookieName,
		Path:     "/",
		HttpOnly: true,
		Secure:   isProd,
		SameSite: http.SameSiteLaxMode,
	}
}

func SetNewCookies(c *echo.Context, token string, isProd bool) {
	cookie := cookieTemplate(isProd)
	cookie.Value = token
	cookie.Expires = time.Now().Add(7 * 24 * time.Hour)
	c.SetCookie(cookie)
}

func ClearSessionCookies(c *echo.Context, isProd bool) {
	cookie := cookieTemplate(isProd)
	cookie.MaxAge = -1
	cookie.Expires = time.Now().Add(-1 * time.Hour)
	c.SetCookie(cookie)
}
