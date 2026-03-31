package auth

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"time"

	"github.com/labstack/echo/v5"
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

const stateCookieName = "oauth_state"

func cookieTemplate(isProd bool) *http.Cookie {
	return &http.Cookie{
		Name:     stateCookieName,
		Path:     "/",
		HttpOnly: true,
		Secure:   isProd,
		SameSite: http.SameSiteLaxMode,
	}
}

func setStateCookie(c *echo.Context, state string, isProd bool) {
	cookie := cookieTemplate(isProd)
	cookie.Value = state
	cookie.Expires = time.Now().Add(10 * time.Minute)
	c.SetCookie(cookie)
}

func clearStateCookie(c *echo.Context, isProd bool) {
	cookie := cookieTemplate(isProd)
	cookie.Value = ""
	cookie.Expires = time.Now().Add(-1 * time.Hour)
	c.SetCookie(cookie)
}

func getStateFromCookie(c *echo.Context) (string, error) {
	cookie, err := c.Cookie(stateCookieName)
	if err != nil {
		return "", err
	}

	return cookie.Value, nil
}