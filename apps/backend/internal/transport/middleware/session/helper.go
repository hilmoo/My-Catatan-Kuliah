package msession

import (
	"backend/internal/gen/sqlc"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"net/http"
	"os"
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
		return db.User{}, errors.New("context value is not of type *db.User")
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

func cookieTemplate() *http.Cookie {
	isProd := os.Getenv("APP_ENV") == "production"

	return &http.Cookie{
		Name:     sessionCookieName,
		Path:     "/",
		HttpOnly: true,
		Secure:   isProd,
		SameSite: http.SameSiteLaxMode,
	}
}

func SetNewCookies(c *echo.Context, token string) {
	cookie := cookieTemplate()
	cookie.Value = token
	cookie.Expires = time.Now().Add(7 * 24 * time.Hour)
	c.SetCookie(cookie)
}

func ClearSessionCookies(c *echo.Context) {
	cookie := cookieTemplate()
	cookie.MaxAge = -1
	cookie.Expires = time.Unix(0, 0)
	c.SetCookie(cookie)
}
