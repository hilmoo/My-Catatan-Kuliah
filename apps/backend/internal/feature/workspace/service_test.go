//go:build integration

package workspace

import (
	"context"
	"fmt"
	"log"
	"os"
	"testing"

	"net/http"

	"backend/internal/gen/models"
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

	testUser, err = tdb.CreateUser(ctx, "workspace-test@example.com", "Workspace Test User")
	if err != nil {
		log.Printf("failed to create test user: %v", err)
		return 1
	}

	return m.Run()
}

func withUser() context.Context {
	return msession.SetUserInContext(context.Background(), testUser)
}

func TestCreateWorkspaceService(t *testing.T) {
	ctx := withUser()
	name := fmt.Sprintf("workspace-%s", t.Name())

	resp, herr := createWorkspaceService(ctx, createWorkspaceServiceParams{
		queries: tdb.Queries,
		body:    &models.WorkspacesCreateRequest{Name: name},
	})

	require.Nil(t, herr)
	require.NotNil(t, resp)
	assert.Equal(t, name, resp.Name)
	assert.NotEmpty(t, resp.Id)
	assert.NotEmpty(t, resp.OwnerId)
}

func TestListWorkspacesService(t *testing.T) {
	ctx := withUser()

	// Create two workspaces
	for i := 0; i < 2; i++ {
		_, herr := createWorkspaceService(ctx, createWorkspaceServiceParams{
			queries: tdb.Queries,
			body:    &models.WorkspacesCreateRequest{Name: fmt.Sprintf("list-ws-%s-%d", t.Name(), i)},
		})
		require.Nil(t, herr)
	}

	resp, herr := listWorkspacesService(ctx, listWorkspacesServiceParams{
		queries: tdb.Queries,
	})

	require.Nil(t, herr)
	assert.GreaterOrEqual(t, len(resp), 2)
}

func TestGetWorkspaceDetailsService(t *testing.T) {
	ctx := withUser()
	name := fmt.Sprintf("detail-ws-%s", t.Name())

	created, herr := createWorkspaceService(ctx, createWorkspaceServiceParams{
		queries: tdb.Queries,
		body:    &models.WorkspacesCreateRequest{Name: name},
	})
	require.Nil(t, herr)

	got, herr := getWorkspaceDetailsService(ctx, getWorkspaceDetailsServiceParams{
		queries: tdb.Queries,
		id:      created.Id,
	})

	require.Nil(t, herr)
	require.NotNil(t, got)
	assert.Equal(t, name, got.Name)
	assert.Equal(t, created.Id, got.Id)
}

func TestUpdateWorkspaceService(t *testing.T) {
	ctx := withUser()

	created, herr := createWorkspaceService(ctx, createWorkspaceServiceParams{
		queries: tdb.Queries,
		body:    &models.WorkspacesCreateRequest{Name: "original-" + t.Name()},
	})
	require.Nil(t, herr)

	newName := "updated-" + t.Name()
	updated, herr := updateWorkspaceService(ctx, updateWorkspaceServiceParams{
		queries: tdb.Queries,
		id:      created.Id,
		body:    &models.WorkspacesUpdateRequest{Name: newName},
	})

	require.Nil(t, herr)
	require.NotNil(t, updated)
	assert.Equal(t, newName, updated.Name)
}

func TestDeleteWorkspaceService(t *testing.T) {
	ctx := withUser()

	created, herr := createWorkspaceService(ctx, createWorkspaceServiceParams{
		queries: tdb.Queries,
		body:    &models.WorkspacesCreateRequest{Name: "delete-ws-" + t.Name()},
	})
	require.Nil(t, herr)

	herr = deleteWorkspaceService(ctx, deleteWorkspaceServiceParams{
		queries: tdb.Queries,
		id:      created.Id,
	})
	require.Nil(t, herr)

	// Should not be found after deletion
	_, herr = getWorkspaceDetailsService(ctx, getWorkspaceDetailsServiceParams{
		queries: tdb.Queries,
		id:      created.Id,
	})
	assert.NotNil(t, herr)
}

func TestCreateWorkspaceService_Unauthenticated(t *testing.T) {
	ctx := context.Background() // no user in context

	_, herr := createWorkspaceService(ctx, createWorkspaceServiceParams{
		queries: tdb.Queries,
		body:    &models.WorkspacesCreateRequest{Name: "should-fail"},
	})

	require.NotNil(t, herr)
	assert.Equal(t, http.StatusUnauthorized, herr.StatusCode())
}
