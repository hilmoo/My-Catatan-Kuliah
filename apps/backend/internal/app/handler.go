package app

import (
	"log/slog"
	"net/http"

	"backend/internal/feature/assignment"
	"backend/internal/feature/auth"
	"backend/internal/feature/course"
	"backend/internal/feature/files"
	"backend/internal/feature/health"
	"backend/internal/feature/note"
	"backend/internal/feature/swagger"
	"backend/internal/feature/workspace"
	db "backend/internal/gen/sqlc"
	"backend/internal/store/config"
	helpert "backend/internal/transport/helper"
	mlog "backend/internal/transport/middleware/log"
	msession "backend/internal/transport/middleware/session"
	"backend/internal/transport/validation"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/rhnvrm/simples3"
)

type initHandlerParams struct {
	logger *slog.Logger
	vld    *validation.Vld
	dbPool *pgxpool.Pool
	s3     *simples3.S3
	cfg    config.Config
}

func initHandler(args initHandlerParams) *echo.Echo {
	e := echo.New()
	queries := db.New(args.dbPool)

	e.Pre(middleware.RemoveTrailingSlash())
	e.Use(middleware.Recover())
	e.Use(middleware.RequestID())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodHead, http.MethodPost},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept},
	}))
	e.Use(mlog.New(args.logger).EchoMiddleware())

	e.Use(msession.New(queries, args.cfg.Secret).LoadSession)

	httpHandlerParams := helpert.HttpHandlerParams{
		Validate: args.vld,
		Queries:  queries,
		Config:   args.cfg,
	}

	registerFrontend(e)

	api := e.Group("/api")
	health.NewHttpHandler().RegisterRoutes(api)
	swagger.NewHttpHandler().RegisterRoutes(api)
	auth.NewHttpHandler(httpHandlerParams).RegisterRoutes(api)

	noAuth := e.Group("/api")
	noAuth.Use(msession.RequireNoAuth)

	protected := e.Group("/api")
	protected.Use(msession.RequireAuth)
	assignment.NewHttpHandler(httpHandlerParams).RegisterRoutes(protected)
	course.NewHttpHandler(httpHandlerParams).RegisterRoutes(protected)
	files.NewHttpHandler(httpHandlerParams, args.s3).RegisterRoutes(protected)
	note.NewHttpHandler(httpHandlerParams).RegisterRoutes(protected)
	workspace.NewHttpHandler(httpHandlerParams).RegisterRoutes(protected)

	return e
}
