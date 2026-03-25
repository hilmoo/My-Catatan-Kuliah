package app

import (
	"log/slog"

	"backend/internal/feature/auth"
	"backend/internal/feature/health"
	"backend/internal/feature/page"
	"backend/internal/feature/session"
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
)

type initHandlerParams struct {
	logger *slog.Logger
	vld    *validation.Vld
	dbPool *pgxpool.Pool
	cfg    config.Config
}

func initHandler(args initHandlerParams) *echo.Echo {
	e := echo.New()
	queries := db.New(args.dbPool)

	e.Pre(middleware.RemoveTrailingSlash())
	e.Use(middleware.Recover())
	e.Use(middleware.RequestID())
	e.Use(middleware.CORS("*"))
	e.Use(mlog.New(args.logger).EchoMiddleware())

	e.Use(msession.New(queries, args.cfg.Secret).LoadSession)

	httpHandlerParams := helpert.HttpHandlerParams{
		Validate: args.vld,
		Queries:  queries,
		Config:   args.cfg,
	}

	api := e.Group("/api")
	health.NewHttpHandler().RegisterRoutes(api)

	noAuth := e.Group("/api")
	noAuth.Use(msession.RequireNoAuth)
	auth.NewHttpHandler(httpHandlerParams).RegisterRoutes(noAuth)

	protected := e.Group("/api")
	protected.Use(msession.RequireAuth)
	session.NewHttpHandler(httpHandlerParams).RegisterRoutes(protected)
	workspace.NewHttpHandler(httpHandlerParams).RegisterRoutes(protected)
	page.NewHttpHandler(httpHandlerParams).RegisterRoutes(protected)

	return e
}
