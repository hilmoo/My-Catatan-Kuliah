//go:build integration

package assignment

import (
	"context"
	"fmt"
	"log"
	"os"
	"testing"
	"time"

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

	testUser, err = tdb.CreateUser(ctx, "assignment-test@example.com", "Assignment Test User")
	if err != nil {
		log.Printf("failed to create test user: %v", err)
		return 1
	}

	workspace, err := tdb.Queries.CreateWorkspace(ctx, db.CreateWorkspaceParams{
		Name:    "Assignment Test Workspace",
		OwnerID: testUser.ID,
	})
	if err != nil {
		log.Printf("failed to create test workspace: %v", err)
		return 1
	}

	testCourse, err = tdb.Queries.CreateCourse(ctx, db.CreateCourseParams{
		WorkspaceID: workspace.ID,
		Title:       "Assignment Test Course",
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

func dueDate() time.Time {
	return time.Now().Add(7 * 24 * time.Hour)
}

func createTestAssignment(t *testing.T, title string) *models.AssignmentsCreateResponse {
	t.Helper()
	resp, herr := createAssignmentService(withUser(), createAssignmentServiceParams{
		queries: tdb.Queries,
		body: &models.AssignmentsServiceCreateAssignmentJSONRequestBody{
			CourseId: testCrsId,
			Title:    title,
			Status:   models.Todo,
			Position: 1.0,
			DueDate:  dueDate(),
		},
	})
	require.Nil(t, herr)
	return resp
}

func TestCreateAssignmentService(t *testing.T) {
	title := fmt.Sprintf("assignment-%s", t.Name())

	resp, herr := createAssignmentService(withUser(), createAssignmentServiceParams{
		queries: tdb.Queries,
		body: &models.AssignmentsServiceCreateAssignmentJSONRequestBody{
			CourseId: testCrsId,
			Title:    title,
			Status:   models.Todo,
			Position: 1.0,
			DueDate:  dueDate(),
		},
	})

	require.Nil(t, herr)
	require.NotNil(t, resp)
	assert.Equal(t, title, resp.Title)
	assert.Equal(t, models.Todo, resp.Status)
	assert.NotNil(t, resp.Id)
}

func TestListAssignmentsService(t *testing.T) {
	for i := 0; i < 2; i++ {
		createTestAssignment(t, fmt.Sprintf("list-assign-%s-%d", t.Name(), i))
	}

	resp, herr := listAssignmentsService(withUser(), listAssignmentsServiceParams{
		queries:   tdb.Queries,
		courseIid: testCrsId,
	})

	require.Nil(t, herr)
	assert.GreaterOrEqual(t, len(resp), 2)
}

func TestGetAssignmentDetailsService(t *testing.T) {
	created := createTestAssignment(t, "detail-assign-"+t.Name())

	got, herr := getAssignmentDetailsService(withUser(), getAssignmentDetailsServiceParams{
		queries: tdb.Queries,
		id:      *created.Id,
	})

	require.Nil(t, herr)
	require.NotNil(t, got)
	assert.Equal(t, created.Title, got.Title)
	assert.Equal(t, *created.Id, *got.Id)
}

func TestUpdateAssignmentService(t *testing.T) {
	created := createTestAssignment(t, "update-assign-"+t.Name())
	newTitle := "updated-" + t.Name()
	status := models.InProgress

	updated, herr := updateAssignmentService(withUser(), updateAssignmentServiceParams{
		queries: tdb.Queries,
		id:      *created.Id,
		body: &models.AssignmentsUpdateRequest{
			Title:  &newTitle,
			Status: &status,
		},
	})

	require.Nil(t, herr)
	require.NotNil(t, updated)
	assert.Equal(t, newTitle, updated.Title)
	assert.Equal(t, models.InProgress, updated.Status)
}

func TestDeleteAssignmentService(t *testing.T) {
	created := createTestAssignment(t, "delete-assign-"+t.Name())

	herr := deleteAssignmentService(withUser(), deleteAssignmentServiceParams{
		queries: tdb.Queries,
		id:      *created.Id,
	})
	require.Nil(t, herr)

	_, herr = getAssignmentDetailsService(withUser(), getAssignmentDetailsServiceParams{
		queries: tdb.Queries,
		id:      *created.Id,
	})
	assert.NotNil(t, herr)
}

func TestCreateAssignmentService_Unauthenticated(t *testing.T) {
	_, herr := createAssignmentService(context.Background(), createAssignmentServiceParams{
		queries: tdb.Queries,
		body: &models.AssignmentsServiceCreateAssignmentJSONRequestBody{
			CourseId: testCrsId,
			Title:    "should-fail",
			Status:   models.Todo,
			Position: 1.0,
			DueDate:  dueDate(),
		},
	})

	require.NotNil(t, herr)
	assert.Equal(t, http.StatusUnauthorized, herr.StatusCode())
}
