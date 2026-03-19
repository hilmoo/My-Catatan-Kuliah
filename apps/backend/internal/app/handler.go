package app

import (
	"log/slog"

	"backend/internal/feature/assignments"
	"backend/internal/feature/auth"
	"backend/internal/feature/course-note"
	"backend/internal/feature/couses"
	"backend/internal/feature/users"
	"backend/internal/feature/workspaces"
	api "backend/internal/gen/server"
	sql "backend/internal/gen/sqlc"
	mlog "backend/internal/transport/middleware/log"
	"backend/internal/transport/validation"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

type Server struct {
	*assignments.AssignmentHttpHandler
	*auth.AuthHttpHandler
	*course_notes.CourseNotesHttpHandler
	*courses.CoursesHttpHandler
	*users.UsersHttpHandler
	*workspaces.WorkspacesHttpHandler
}

var _ api.ServerInterface = (*Server)(nil)

func initHandler(logger *slog.Logger, vld *validation.Vld, dbPool *pgxpool.Pool, cfg Config) *echo.Echo {
	e := echo.New()
	queries := sql.New(dbPool)

	e.Pre(middleware.RemoveTrailingSlash())
	e.Use(middleware.RequestID(), middleware.CORS("*"), mlog.New(logger).EchoMiddleware(), middleware.Recover())

	handlers := &Server{
		AssignmentHttpHandler:  assignments.NewAssignmentHttpHandler(vld, queries),
		AuthHttpHandler:        auth.NewAuthHttpHandler(vld, queries),
		CourseNotesHttpHandler: course_notes.NewCourseNotesHttpHandler(vld, queries),
		CoursesHttpHandler:     courses.NewCoursesHttpHandler(vld, queries),
		UsersHttpHandler:       users.NewUsersHttpHandler(vld, queries),
		WorkspacesHttpHandler:  workspaces.NewWorkspacesHttpHandler(vld, queries),
	}

	api.RegisterHandlers(e, handlers)

	return e
}
