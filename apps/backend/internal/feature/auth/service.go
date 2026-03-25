package auth

import (
	db "backend/internal/gen/sqlc"
	msession "backend/internal/transport/middleware/session"
	"context"
	"encoding/json"
	"time"

	"github.com/ory/herodot"
	"golang.org/x/oauth2"
)

func googleLoginService() (string, *herodot.DefaultError) {
	state, err := generateRandomString()
	if err != nil {
		return "", herodot.ErrInternalServerError.WithReason("failed to generate state").WithDebug(err.Error())
	}

	return state, nil
}

type googleUserInfo struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}
type googleCallbackServiceParams struct {
	code        string
	ipAddress   string
	userAgent   string
	oauthConfig *oauth2.Config
	queries     *db.Queries
	secret      string
}

func googleCallbackService(
	ctx context.Context,
	args googleCallbackServiceParams,
) (string, *herodot.DefaultError) {
	token, err := generateRandomString()
	if err != nil {
		return "", herodot.ErrInternalServerError.WithReason("failed to generate session token").WithDebug(err.Error())
	}

	oauth2Token, err := args.oauthConfig.Exchange(ctx, args.code)
	if err != nil {
		return "", herodot.ErrInternalServerError.WithReason("failed to exchange code for token").WithDebug(err.Error())
	}

	googleClient := args.oauthConfig.Client(ctx, oauth2Token)
	resp, err := googleClient.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return "", herodot.ErrInternalServerError.WithReason("failed to get user info from Google").WithDebug(err.Error())
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != 200 {
		return "", herodot.ErrInternalServerError.WithReason("failed to get user info from Google").WithDebug("non-200 response: " + resp.Status)
	}

	var userInfo googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return "", herodot.ErrInternalServerError.WithReason("failed to decode user info").WithDebug(err.Error())
	}

	user, err := args.queries.UpdateOrCreateUser(ctx, db.UpdateOrCreateUserParams{
		Email:      userInfo.Email,
		Name:       userInfo.Name,
		AvatarUrl:  &userInfo.Picture,
		Provider:   db.ProviderGoogle,
		ProviderID: userInfo.ID,
	})
	if err != nil {
		return "", herodot.ErrInternalServerError.WithReason("failed to create or update user").WithDebug(err.Error())
	}

	err = args.queries.CreateNewSession(ctx, db.CreateNewSessionParams{
		UserID:    int32(user.ID),
		HashToken: msession.HashSessionToken(args.secret, token),
		ExpiresAt: time.Now().UTC().Add(24 * time.Hour * 7),
		IpAddress: &args.ipAddress,
		UserAgent: &args.userAgent,
	})
	if err != nil {
		return "", herodot.ErrInternalServerError.WithReason("failed to create session").WithDebug(err.Error())
	}

	return token, nil
}

type logoutServiceParams struct {
	token   string
	secret  string
	queries *db.Queries
}

func logoutService(ctx context.Context, args logoutServiceParams) *herodot.DefaultError {
	hashToken := msession.HashSessionToken(args.secret, args.token)
	err := args.queries.DeleteSessionByToken(ctx, hashToken)
	if err != nil {
		return herodot.ErrInternalServerError.WithReason("failed to delete session").WithDebug(err.Error())
	}

	return nil
}
