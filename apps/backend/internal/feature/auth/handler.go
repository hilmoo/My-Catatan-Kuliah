package auth

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	errort "backend/internal/transport/error"
	helpert "backend/internal/transport/helper"
	msession "backend/internal/transport/middleware/session"
	"backend/internal/transport/validation"
	"net/http"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/ory/herodot"
	"golang.org/x/oauth2"
)

type httpHandler struct {
	validate          *validation.Vld
	queries           *db.Queries
	googleOauthConfig *oauth2.Config
	secret            string
	isProd            bool
}

func NewHttpHandler(args helpert.HttpHandlerParams) *httpHandler {
	return &httpHandler{
		validate:          args.Validate,
		queries:           args.Queries,
		googleOauthConfig: args.Config.GoogleOauthConfig,
		secret:            args.Config.Secret,
		isProd:            args.Config.IsProd,
	}
}

func (h *httpHandler) RegisterRoutes(e *echo.Group) {
	group := e.Group("/auth")

	group.GET("/oauth/google", h.oauthGoogleLogin)
	group.GET("/oauth/callback/google", h.oauthGoogleCallback)
	group.POST("/logout", h.logout)
}

func (h *httpHandler) oauthGoogleLogin(c *echo.Context) error {
	state, err := googleLoginService()
	if err != nil {
		return errort.HttpError(c, err)
	}

	c.SetCookie(&http.Cookie{
		Name:     "state",
		Value:    state,
		Path:     "/",
		Expires:  time.Now().Add(10 * time.Minute),
		HttpOnly: true,
		Secure:   h.isProd,
		SameSite: http.SameSiteLaxMode,
	})

	authUrl := h.googleOauthConfig.AuthCodeURL(state)
	return c.Redirect(http.StatusTemporaryRedirect, authUrl)
}

func (h *httpHandler) oauthGoogleCallback(c *echo.Context) error {
	stateCookie, err := c.Cookie("state")
	if err != nil {
		return errort.HttpError(c, herodot.ErrBadRequest.WithReason("state cookie not found").WithDebug(err.Error()))
	}

	params, errH := validation.BindValidatePayload[models.HandleGoogleOAuthCallbackParams](c, h.validate)
	if errH != nil {
		return errort.HttpError(c, errH)
	}

	if params.State != stateCookie.Value {
		return errort.HttpError(c, herodot.ErrBadRequest.WithReason("invalid state parameter"))
	}

	sessionToken, errH := googleCallbackService(c.Request().Context(), googleCallbackServiceParams{
		code:        params.Code,
		ipAddress:   c.RealIP(),
		userAgent:   c.Request().UserAgent(),
		oauthConfig: h.googleOauthConfig,
		queries:     h.queries,
		secret:      h.secret,
	})
	if errH != nil {
		return errort.HttpError(c, errH)
	}

	msession.SetNewCookies(c, sessionToken, h.isProd)
	return c.Redirect(http.StatusTemporaryRedirect, "/")
}

func (h *httpHandler) logout(c *echo.Context) error {
	token, err := msession.GetSessionToken(c)
	if err != nil {
		return errort.HttpError(c, herodot.ErrBadRequest.WithReason("session token not found").WithDebug(err.Error()))
	}

	errH := logoutService(c.Request().Context(), logoutServiceParams{
		token:   token,
		secret:  h.secret,
		queries: h.queries,
	})
	if errH != nil {
		return errort.HttpError(c, errH)
	}

	msession.ClearSessionCookies(c, h.isProd)
	return c.Redirect(http.StatusTemporaryRedirect, "/")
}
