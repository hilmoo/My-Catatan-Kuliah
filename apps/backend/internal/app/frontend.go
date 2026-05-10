//go:build !dev

package app

import (
	"embed"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

//go:embed all:dist
var dist embed.FS

// RegisterFrontend mounts the embedded static files.
func registerFrontend(e *echo.Echo) {
	e.Use(middleware.StaticWithConfig(middleware.StaticConfig{
		Root:       "dist",
		HTML5:      true,
		Browse:     true,
		IgnoreBase: true,
		Filesystem: dist,
		Index:      "index.html",
	}))
}
