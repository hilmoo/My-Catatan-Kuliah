//go:build integration

package course

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
	tdb           *testdb.TestDB
	testUser      db.User
	testWorkspace db.Workspace
	testWsId      string // base58-encoded workspace iid
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

	testUser, err = tdb.CreateUser(ctx, "course-test@example.com", "Course Test User")
	if err != nil {
		log.Printf("failed to create test user: %v", err)
		return 1
	}

	testWorkspace, err = tdb.Queries.CreateWorkspace(ctx, db.CreateWorkspaceParams{
		Name:    "Course Test Workspace",
		OwnerID: testUser.ID,
	})
	if err != nil {
		log.Printf("failed to create test workspace: %v", err)
		return 1
	}

	testWsId, err = uuidx.ToBase58(testWorkspace.Iid)
	if err != nil {
		log.Printf("failed to encode workspace iid: %v", err)
		return 1
	}

	return m.Run()
}

func withUser() context.Context {
	return msession.SetUserInContext(context.Background(), testUser)
}

func createTestCourse(t *testing.T, title string) *models.CoursesCreateResponse {
	t.Helper()
	resp, herr := createCourseService(withUser(), createCourseServiceParams{
		queries: tdb.Queries,
		body: &models.CoursesCreateRequest{
			WorkspaceId: testWsId,
			Title:       title,
			Instructor:  "Dr. Test",
			Credits:     intPtr(3),
			Position:    1.0,
		},
	})
	require.Nil(t, herr)
	return resp
}

func intPtr(v int) *int { return &v }

func TestCreateCourseService(t *testing.T) {
	title := fmt.Sprintf("course-%s", t.Name())

	resp, herr := createCourseService(withUser(), createCourseServiceParams{
		queries: tdb.Queries,
		body: &models.CoursesCreateRequest{
			WorkspaceId: testWsId,
			Title:       title,
			Instructor:  "Dr. Test",
			Credits:     intPtr(3),
			Position:    1.0,
		},
	})

	require.Nil(t, herr)
	require.NotNil(t, resp)
	assert.Equal(t, title, resp.Title)
	assert.Equal(t, "Dr. Test", resp.Instructor)
	assert.Equal(t, 3, resp.Credits)
	assert.NotNil(t, resp.Id)
}

func TestListCoursesService(t *testing.T) {
	for i := 0; i < 2; i++ {
		createTestCourse(t, fmt.Sprintf("list-course-%s-%d", t.Name(), i))
	}

	resp, herr := listCoursesService(withUser(), listCoursesServiceParams{
		queries:     tdb.Queries,
		workspaceId: testWsId,
	})

	require.Nil(t, herr)
	assert.GreaterOrEqual(t, len(resp), 2)
}

func TestGetCourseDetailsService(t *testing.T) {
	created := createTestCourse(t, "get-detail-"+t.Name())

	got, herr := getCourseDetailsService(withUser(), getCourseDetailsServiceParams{
		queries: tdb.Queries,
		id:      *created.Id,
	})

	require.Nil(t, herr)
	require.NotNil(t, got)
	assert.Equal(t, created.Title, got.Title)
	assert.Equal(t, *created.Id, *got.Id)
}

func TestUpdateCourseService(t *testing.T) {
	created := createTestCourse(t, "update-course-"+t.Name())
	newTitle := "updated-" + t.Name()

	updated, herr := updateCourseService(withUser(), updateCourseServiceParams{
		queries: tdb.Queries,
		id:      *created.Id,
		body: &models.CoursesUpdateRequest{
			Title: &newTitle,
		},
	})

	require.Nil(t, herr)
	require.NotNil(t, updated)
	assert.Equal(t, newTitle, updated.Title)
}

func TestDeleteCourseService(t *testing.T) {
	created := createTestCourse(t, "delete-course-"+t.Name())

	herr := deleteCourseService(withUser(), deleteCourseServiceParams{
		queries: tdb.Queries,
		id:      *created.Id,
	})
	require.Nil(t, herr)

	_, herr = getCourseDetailsService(withUser(), getCourseDetailsServiceParams{
		queries: tdb.Queries,
		id:      *created.Id,
	})
	assert.NotNil(t, herr)
}

func TestCreateCourseService_Unauthenticated(t *testing.T) {
	_, herr := createCourseService(context.Background(), createCourseServiceParams{
		queries: tdb.Queries,
		body: &models.CoursesCreateRequest{
			WorkspaceId: testWsId,
			Title:       "should-fail",
			Instructor:  "Nobody",
		},
	})

	require.NotNil(t, herr)
	assert.Equal(t, http.StatusUnauthorized, herr.StatusCode())
}
