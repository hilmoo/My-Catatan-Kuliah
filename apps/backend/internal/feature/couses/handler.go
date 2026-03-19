package courses

import (
	"backend/internal/gen/models"
	sql "backend/internal/gen/sqlc"
	"backend/internal/transport/validation"

	"github.com/labstack/echo/v5"
)

type CoursesHttpHandler struct {
	validate *validation.Vld
	queries  *sql.Queries
}

func NewCoursesHttpHandler(vld *validation.Vld, queries *sql.Queries) *CoursesHttpHandler {
	return &CoursesHttpHandler{
		validate: vld,
		queries:  queries,
	}
}

func (h *CoursesHttpHandler) GetCourses(ctx *echo.Context, params models.GetCoursesParams) error {
	return nil
}

func (h *CoursesHttpHandler) PostCourses(ctx *echo.Context) error {
	return nil
}

func (h *CoursesHttpHandler) DeleteCoursesCourseId(ctx *echo.Context, courseId string) error {
	return nil
}

func (h *CoursesHttpHandler) GetCoursesCourseId(ctx *echo.Context, courseId string) error {
	return nil
}

func (h *CoursesHttpHandler) PatchCoursesCourseId(ctx *echo.Context, courseId string) error {
	return nil
}
