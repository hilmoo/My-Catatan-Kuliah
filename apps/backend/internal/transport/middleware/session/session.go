package msession

import (
	"backend/internal/gen/sqlc"
	"context"
	"net/http"

	"github.com/labstack/echo/v5"
)

type usercontextKeyType string

const userContextKey usercontextKeyType = "authenticated_user"
const sessionCookieName = "session"

type sessionMiddleware struct {
	secret  string
	queries *db.Queries
}

func New(queries *db.Queries, secret string) *sessionMiddleware {
	return &sessionMiddleware{
		secret:  secret,
		queries: queries,
	}
}

func (m *sessionMiddleware) LoadSession(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c *echo.Context) error {
		cookie, err := c.Cookie(sessionCookieName)
		if err != nil {
			return next(c)
		}

		hashToken := HashSessionToken(m.secret, cookie.Value)

		session, err := m.queries.GetSessionByToken(c.Request().Context(), hashToken)
		if err != nil {
			return next(c)
		}

		user, err := m.queries.GetuserById(c.Request().Context(), session.UserID)
		if err != nil {
			return next(c)
		}

		ctx := context.WithValue(c.Request().Context(), userContextKey, user)
		c.SetRequest(c.Request().WithContext(ctx))

		return next(c)
	}
}

func RequireAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c *echo.Context) error {
		_, err := GetUserFromContext(c.Request().Context())
		if err != nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "authentication required")
		}

		return next(c)
	}
}
