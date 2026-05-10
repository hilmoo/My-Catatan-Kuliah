//go:build dev

package app

import (
	"net/url"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

func registerFrontend(e *echo.Echo) {
	targetURL, err := url.Parse("http://localhost:3000")
	if err != nil {
		panic(err)
	}

	e.Use(middleware.ProxyWithConfig(middleware.ProxyConfig{
		Skipper: func(c *echo.Context) bool {
			return strings.HasPrefix(c.Path(), "/api")
		},
		Balancer: middleware.NewRoundRobinBalancer([]*middleware.ProxyTarget{
			{
				URL: targetURL,
			},
		}),
	}))
}
