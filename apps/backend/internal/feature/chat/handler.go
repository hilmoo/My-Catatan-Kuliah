package chat

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	errort "backend/internal/transport/error"
	helpert "backend/internal/transport/helper"
	msession "backend/internal/transport/middleware/session"
	"backend/internal/transport/validation"
	"backend/internal/utils/uuidx"
	"net/url"

	"github.com/labstack/echo/v5"
	"github.com/ory/herodot"
)

type httpHandler struct {
	validate           *validation.Vld
	queries            *db.Queries
	aiServiceUrlParsed *url.URL
}

func NewHttpHandler(args helpert.HttpHandlerParams) *httpHandler {
	return &httpHandler{
		validate:           args.Validate,
		queries:            args.Queries,
		aiServiceUrlParsed: args.Config.AiServiceUrlParsed,
	}
}

func (h *httpHandler) RegisterRoutes(e *echo.Group) {
	group := e.Group("/chat")

	group.Any("/:workspaceId", h.proxyAi)
	group.Any("/:chatId/stream", h.proxyChatStream)
	group.GET("/:chatId/history", h.getChatHistory)
	group.PATCH("/:chatId/title", h.updateChatTitle)
	group.GET("/workspace/:workspaceId", h.listChats)

}

func (h *httpHandler) updateChatTitle(c *echo.Context) error {
	user, errs := msession.GetUserFromContext(c.Request().Context())
	if errs != nil {
		return errort.HttpError(c, herodot.ErrUnauthorized.WithReason("user not authenticated").WithDebug(errs.Error()))
	}

	var req models.ChatsUpdateChatTitleRequest
	if err := c.Bind(&req); err != nil {
		return errort.HttpError(c, herodot.ErrBadRequest.WithReason("invalid request body").WithDebug(err.Error()))
	}

	resp, err := updateChatTitleService(c.Request().Context(), updateChatTitleServiceParams{
		queries: h.queries,
		chatId:  c.Param("chatId"),
		userId:  user.ID,
		title:   req.Title,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) listChats(c *echo.Context) error {
	user, errs := msession.GetUserFromContext(c.Request().Context())
	if errs != nil {
		return errort.HttpError(c, herodot.ErrUnauthorized.WithReason("user not authenticated").WithDebug(errs.Error()))
	}

	resp, err := listChatsService(c.Request().Context(), listChatsServiceParams{
		queries:     h.queries,
		workspaceId: c.Param("workspaceId"),
		userId:      user.ID,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) getChatHistory(c *echo.Context) error {
	user, errs := msession.GetUserFromContext(c.Request().Context())
	if errs != nil {
		return errort.HttpError(c, herodot.ErrUnauthorized.WithReason("user not authenticated").WithDebug(errs.Error()))
	}

	resp, err := getChatHistoryService(c.Request().Context(), getChatHistoryServiceParams{
		queries: h.queries,
		chatId:  c.Param("chatId"),
		userId:  user.ID,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) proxyAi(c *echo.Context) error {
	workspaceId := c.Param("workspaceId")
	workspaceIid, err := uuidx.HttpFromBase58(workspaceId, "workspace ID")
	if err != nil {
		return errort.HttpError(c, err)
	}

	user, errs := msession.GetUserFromContext(c.Request().Context())
	if errs != nil {
		return errort.HttpError(c, herodot.ErrUnauthorized.WithReason("user not authenticated").WithDebug(errs.Error()))
	}

	exist, errs := h.queries.ValidateWorkspaceOwnership(c.Request().Context(), db.ValidateWorkspaceOwnershipParams{
		Iid:     workspaceIid,
		OwnerID: user.ID,
	})
	if errs != nil {
		return errort.HttpError(c, herodot.ErrInternalServerError.WithReason("failed to validate page access").WithDebug(errs.Error()))
	}
	if !exist {
		return errort.HttpError(c, herodot.ErrNotFound.WithReason("page not found"))
	}

	proxy, err := ProxyAi(ProxyAiParams{
		AiServiceUrl: h.aiServiceUrlParsed,
		WorkspaceID:  workspaceId,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	proxy.ServeHTTP(c.Response(), c.Request())
	return nil
}

func (h *httpHandler) proxyChatStream(c *echo.Context) error {
	chatId := c.Param("chatId")
	chatIid, err := uuidx.HttpFromBase58(chatId, "chat ID")
	if err != nil {
		return errort.HttpError(c, err)
	}

	user, errs := msession.GetUserFromContext(c.Request().Context())
	if errs != nil {
		return errort.HttpError(c, herodot.ErrUnauthorized.WithReason("user not authenticated").WithDebug(errs.Error()))
	}

	exist, errs := h.queries.ValidateChatOwnership(c.Request().Context(), db.ValidateChatOwnershipParams{
		Iid:    chatIid,
		UserID: user.ID,
	})
	if errs != nil {
		return errort.HttpError(c, herodot.ErrInternalServerError.WithReason("failed to validate page access").WithDebug(errs.Error()))
	}
	if !exist {
		return errort.HttpError(c, herodot.ErrNotFound.WithReason("page not found"))
	}

	proxy, err := ProxyAi(ProxyAiParams{
		AiServiceUrl: h.aiServiceUrlParsed,
		ChatID:       chatId,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	proxy.ServeHTTP(c.Response(), c.Request())
	return nil
}
