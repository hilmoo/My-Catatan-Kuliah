//go:build integration

package auth

import (
	"context"
	"log"
	"os"
	"testing"
	"time"

	db "backend/internal/gen/sqlc"
	msession "backend/internal/transport/middleware/session"
	"backend/internal/utils/testdb"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	tdb      *testdb.TestDB
	testUser db.User
)

func TestMain(m *testing.M) {
	os.Exit(runMain(m))
}

func runMain(m *testing.M) int {
	ctx := context.Background()

	var cleanup func()
	var err error
	tdb, cleanup, err = testdb.Setup(ctx)
	if err != nil {
		log.Printf("failed to setup test db: %v", err)
		return 1
	}
	defer cleanup()

	testUser, err = tdb.CreateUser(ctx, "auth-test@example.com", "Auth Test User")
	if err != nil {
		log.Printf("failed to create test user: %v", err)
		return 1
	}

	return m.Run()
}

func TestLogoutService(t *testing.T) {
	ctx := context.Background()
	secret := "test-secret"
	token := "test-session-token-" + t.Name()
	hashToken := msession.HashSessionToken(secret, token)

	// Create a session to log out from
	err := tdb.Queries.CreateNewSession(ctx, db.CreateNewSessionParams{
		UserID:    testUser.ID,
		HashToken: hashToken,
		ExpiresAt: time.Now().UTC().Add(24 * time.Hour),
	})
	require.NoError(t, err)

	herr := logoutService(ctx, logoutServiceParams{
		token:   token,
		secret:  secret,
		queries: tdb.Queries,
	})

	require.Nil(t, herr)

	// Session should be gone
	_, err = tdb.Queries.GetSessionByToken(ctx, hashToken)
	assert.Error(t, err)
}

func TestLogoutService_NonExistentToken(t *testing.T) {
	herr := logoutService(context.Background(), logoutServiceParams{
		token:   "nonexistent-token-" + t.Name(),
		secret:  "test-secret",
		queries: tdb.Queries,
	})

	// Deleting a nonexistent session should not error (DELETE is idempotent)
	assert.Nil(t, herr)
}

func TestGoogleLoginService(t *testing.T) {
	state, herr := googleLoginService()

	require.Nil(t, herr)
	assert.NotEmpty(t, state)
}
