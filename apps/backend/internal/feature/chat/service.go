package chat

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	"backend/internal/utils/uuidx"
	"context"
	"net/http/httputil"
	"net/url"
	"strconv"
	"time"

	"github.com/ory/herodot"
)

type ProxyAiParams struct {
	AiServiceUrl *url.URL
	WorkspaceID  string
	ChatID       string
}

func ProxyAi(args ProxyAiParams) (*httputil.ReverseProxy, *herodot.DefaultError) {
	proxy := &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(args.AiServiceUrl)

			if args.WorkspaceID != "" && args.ChatID == "" {
				// Base path with workspace ID: /<workspace-id>
				pr.Out.URL.Path = "/chat/" + args.WorkspaceID
			} else if args.ChatID != "" {
				// Streaming path with chat ID: /<chat-id>/stream
				pr.Out.URL.Path = "/chat/" + args.ChatID + "/stream"
			} else {
				// Default base path
				pr.Out.URL.Path = ""
			}
		},
	}

	return proxy, nil
}

type getChatHistoryServiceParams struct {
	queries *db.Queries
	chatId  string
	userId  int32
}

func getChatHistoryService(ctx context.Context, args getChatHistoryServiceParams) (models.ChatsChatHistoryResponse, *herodot.DefaultError) {
	chatIid, hErr := uuidx.HttpFromBase58(args.chatId, "chat ID")
	if hErr != nil {
		return nil, hErr
	}

	rows, err := args.queries.GetChatHistory(ctx, db.GetChatHistoryParams{
		Iid:    chatIid,
		UserID: args.userId,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to fetch chat history").WithDebug(err.Error())
	}

	history := make(models.ChatsChatHistoryResponse, len(rows))
	for i, row := range rows {
		history[i] = models.ChatsChatMessage{
			Id:        strconv.FormatInt(row.ID, 10),
			Role:      row.Role,
			Text:      row.Text,
			CreatedAt: row.CreatedAt.Format(time.RFC3339),
		}
	}

	return history, nil
}

type listChatsServiceParams struct {
	queries     *db.Queries
	workspaceId string
	userId      int32
}

func listChatsService(ctx context.Context, args listChatsServiceParams) (models.ChatsChatListResponse, *herodot.DefaultError) {
	workspaceIid, hErr := uuidx.HttpFromBase58(args.workspaceId, "workspace ID")
	if hErr != nil {
		return nil, hErr
	}

	rows, err := args.queries.ListChatsByWorkspaceID(ctx, db.ListChatsByWorkspaceIDParams{
		Iid:     workspaceIid,
		OwnerID: args.userId,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReason("failed to fetch chats").WithDebug(err.Error())
	}

	chats := make(models.ChatsChatListResponse, len(rows))
	for i, row := range rows {
		id, hErr := uuidx.HttpToBase58(row.Iid, "chat ID")
		if hErr != nil {
			return nil, hErr
		}

		chats[i] = models.ChatsChatSummary{
			Id:        id,
			Title:     row.Title,
			CreatedAt: row.CreatedAt.Format(time.RFC3339),
		}
	}

	return chats, nil
}

type updateChatTitleServiceParams struct {
	queries *db.Queries
	chatId  string
	userId  int32
	title   string
}

func updateChatTitleService(ctx context.Context, args updateChatTitleServiceParams) (models.ChatsUpdateChatTitleResponse, *herodot.DefaultError) {
	chatIid, hErr := uuidx.HttpFromBase58(args.chatId, "chat ID")
	if hErr != nil {
		return models.ChatsUpdateChatTitleResponse{}, hErr
	}

	err := args.queries.UpdateChatTitle(ctx, db.UpdateChatTitleParams{
		Title:  args.title,
		Iid:    chatIid,
		UserID: args.userId,
	})
	if err != nil {
		return models.ChatsUpdateChatTitleResponse{}, herodot.ErrInternalServerError.WithReason("failed to update chat title").WithDebug(err.Error())
	}

	return models.ChatsUpdateChatTitleResponse{
		Title: args.title,
	}, nil
}
