//go:build integration

package note

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
	"backend/internal/utils/uuidx"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	tdb        *testdb.TestDB
	testUser   db.User
	testCourse db.Course
	testCrsId  string // base58-encoded course iid
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

	testUser, err = tdb.CreateUser(ctx, "note-test@example.com", "Note Test User")
	if err != nil {
		log.Printf("failed to create test user: %v", err)
		return 1
	}

	workspace, err := tdb.Queries.CreateWorkspace(ctx, db.CreateWorkspaceParams{
		Name:    "Note Test Workspace",
		OwnerID: testUser.ID,
	})
	if err != nil {
		log.Printf("failed to create test workspace: %v", err)
		return 1
	}

	testCourse, err = tdb.Queries.CreateCourse(ctx, db.CreateCourseParams{
		WorkspaceID: workspace.ID,
		Title:       "Note Test Course",
		Instructor:  "Dr. Test",
		Credits:     3,
		Position:    1.0,
		CreatedBy:   testUser.ID,
	})
	if err != nil {
		log.Printf("failed to create test course: %v", err)
		return 1
	}

	testCrsId, err = uuidx.ToBase58(testCourse.Iid)
	if err != nil {
		log.Printf("failed to encode course iid: %v", err)
		return 1
	}

	return m.Run()
}

func withUser() context.Context {
	return msession.SetUserInContext(context.Background(), testUser)
}

func strPtr(s string) *string { return &s }

func createTestNote(t *testing.T, title string) *models.NotesCreateResponse {
	t.Helper()
	resp, herr := createNoteService(withUser(), createNoteServiceParams{
		queries: tdb.Queries,
		body: &models.NotesCreateRequest{
			CourseId: testCrsId,
			Title:    title,
			Position: 1.0,
		},
	})
	require.Nil(t, herr)
	return resp
}

func TestCreateNoteService(t *testing.T) {
	title := fmt.Sprintf("note-%s", t.Name())
	content := "This is test content"

	resp, herr := createNoteService(withUser(), createNoteServiceParams{
		queries: tdb.Queries,
		body: &models.NotesCreateRequest{
			CourseId: testCrsId,
			Title:    title,
			Content:  strPtr(content),
			Position: 1.0,
		},
	})

	require.Nil(t, herr)
	require.NotNil(t, resp)
	assert.Equal(t, title, resp.Title)
	assert.Equal(t, &content, resp.Content)
	assert.NotNil(t, resp.Id)
}

func TestListNotesService(t *testing.T) {
	for i := 0; i < 2; i++ {
		createTestNote(t, fmt.Sprintf("list-note-%s-%d", t.Name(), i))
	}

	resp, herr := listNotesService(withUser(), listNotesServiceParams{
		queries:   tdb.Queries,
		courseIid: testCrsId,
	})

	require.Nil(t, herr)
	assert.GreaterOrEqual(t, len(resp), 2)
}

func TestGetNoteDetailsService(t *testing.T) {
	created := createTestNote(t, "detail-note-"+t.Name())

	got, herr := getNoteDetailsService(withUser(), getNoteDetailsServiceParams{
		queries: tdb.Queries,
		id:      *created.Id,
	})

	require.Nil(t, herr)
	require.NotNil(t, got)
	assert.Equal(t, created.Title, got.Title)
	assert.Equal(t, *created.Id, *got.Id)
}

func TestUpdateNoteService(t *testing.T) {
	created := createTestNote(t, "update-note-"+t.Name())
	newTitle := "updated-" + t.Name()
	newContent := "Updated content"

	updated, herr := updateNoteService(withUser(), updateNoteServiceParams{
		queries: tdb.Queries,
		id:      *created.Id,
		body: &models.NotesUpdateRequest{
			Title:   &newTitle,
			Content: strPtr(newContent),
		},
	})

	require.Nil(t, herr)
	require.NotNil(t, updated)
	assert.Equal(t, newTitle, updated.Title)
	assert.Equal(t, &newContent, updated.Content)
}

func TestDeleteNoteService(t *testing.T) {
	created := createTestNote(t, "delete-note-"+t.Name())

	herr := deleteNoteService(withUser(), deleteNoteServiceParams{
		queries: tdb.Queries,
		id:      *created.Id,
	})
	require.Nil(t, herr)

	_, herr = getNoteDetailsService(withUser(), getNoteDetailsServiceParams{
		queries: tdb.Queries,
		id:      *created.Id,
	})
	assert.NotNil(t, herr)
}

func TestCreateNoteService_Unauthenticated(t *testing.T) {
	_, herr := createNoteService(context.Background(), createNoteServiceParams{
		queries: tdb.Queries,
		body: &models.NotesCreateRequest{
			CourseId: testCrsId,
			Title:    "should-fail",
			Position: 1.0,
		},
	})

	require.NotNil(t, herr)
	assert.Equal(t, http.StatusUnauthorized, herr.StatusCode())
}
