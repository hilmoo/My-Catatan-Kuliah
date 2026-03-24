package page

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	"backend/utils/uuidx"
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/ory/herodot"
)

type getParentIdParams struct {
	queries   *db.Queries
	pageType  models.PageCreateType
	parentIid *uuid.UUID
	userId    int32
}

func getPageParentId(ctx context.Context, args getParentIdParams) (*int32, error) {
	if args.parentIid == nil {
		if args.pageType == models.PageCreateTypeAssignment {
			return nil, fmt.Errorf("assignment need parent")
		}
		return nil, nil
	}

	switch args.pageType {
	case models.PageCreateTypeFolder:
		parentId, err := args.queries.GetPageFolderParentIdByIidAndUser(ctx, db.GetPageFolderParentIdByIidAndUserParams{
			Iid:       *args.parentIid,
			CreatedBy: args.userId,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to get folder parent: %w", err)
		}
		return parentId, nil

	case models.PageCreateTypeCourse:
		parentId, err := args.queries.GetPageCourseParentIdByIidAndUser(ctx, db.GetPageCourseParentIdByIidAndUserParams{
			Iid:       *args.parentIid,
			CreatedBy: args.userId,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to get course parent: %w", err)
		}
		return parentId, nil

	case models.PageCreateTypeNote:
		parentId, err := args.queries.GetPageNoteParentIdByIidAndUser(ctx, db.GetPageNoteParentIdByIidAndUserParams{
			Iid:       *args.parentIid,
			CreatedBy: args.userId,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to get note parent: %w", err)
		}
		return parentId, nil

	case models.PageCreateTypeAssignment:
		parentId, err := args.queries.GetPageAssignmentParentIdByIidAndUser(ctx, db.GetPageAssignmentParentIdByIidAndUserParams{
			Iid:       *args.parentIid,
			CreatedBy: args.userId,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to get assignment parent: %w", err)
		}
		return parentId, nil

	default:
		return nil, fmt.Errorf("unsupported page type: %s", args.pageType)
	}
}

type pageData struct {
	ID           int32
	Iid          uuid.UUID
	WorkspaceID  int32
	ParentID     *int32
	Title        string
	Icon         *string
	Type         db.PageType
	Properties   []byte
	CreatedBy    int32
	CreatedAt    time.Time
	UpdatedAt    time.Time
	UserIid      uuid.UUID
	ParentIid    *uuid.UUID
	WorkspaceIid uuid.UUID
}

func buildAssignmentModel(data pageData) (*models.PageDetail, *herodot.DefaultError) {
	id, err := uuidx.HttpToBase58(data.Iid, "assignment ID")
	if err != nil {
		return nil, err
	}

	workspaceId, err := uuidx.HttpToBase58(data.WorkspaceIid, "workspace ID")
	if err != nil {
		return nil, err
	}

	authorId, err := uuidx.HttpToBase58(data.UserIid, "author ID")
	if err != nil {
		return nil, err
	}

	var properties models.PageDetail_Properties
	if data.Properties != nil {
		errs := properties.UnmarshalJSON(data.Properties)
		if errs != nil {
			return nil, herodot.ErrInternalServerError.WithReasonf("failed to unmarshal properties: %v", errs)
		}
	}

	return &models.PageDetail{
		CreatedAt:   &data.CreatedAt,
		CreatedBy:   &authorId,
		Icon:        data.Icon,
		Id:          &id,
		ParentId:    uuidx.PToBase58(data.ParentIid),
		Title:       &data.Title,
		UpdatedAt:   &data.UpdatedAt,
		WorkspaceId: &workspaceId,
	}, nil
}

func mapDbListToModel(a db.ListPagesByWorkspaceIdAndTypeRow) (*models.PageDetail, *herodot.DefaultError) {
	return buildAssignmentModel(pageData{
		ID:           a.ID,
		Iid:          a.Iid,
		WorkspaceID:  a.WorkspaceID,
		ParentID:     a.ParentID,
		Title:        a.Title,
		Icon:         a.Icon,
		Type:         a.Type,
		Properties:   a.Properties,
		CreatedBy:    a.CreatedBy,
		CreatedAt:    a.CreatedAt,
		UpdatedAt:    a.UpdatedAt,
		UserIid:      a.UserIid,
		ParentIid:    a.ParentIid,
		WorkspaceIid: a.WorkspaceIid,
	})
}

func mapDbDetailsToModel(a db.GetPageByIidRow) (*models.PageDetailResponse, *herodot.DefaultError) {
	return buildAssignmentModel(pageData{
		ID:           a.ID,
		Iid:          a.Iid,
		WorkspaceID:  a.WorkspaceID,
		ParentID:     a.ParentID,
		Title:        a.Title,
		Icon:         a.Icon,
		Type:         a.Type,
		Properties:   a.Properties,
		CreatedBy:    a.CreatedBy,
		CreatedAt:    a.CreatedAt,
		UpdatedAt:    a.UpdatedAt,
		UserIid:      a.UserIid,
		ParentIid:    a.ParentIid,
		WorkspaceIid: a.WorkspaceIid,
	})
}

func mapDbCreateToModel(a db.CreatePageRow) (*models.PageDetailResponse, *herodot.DefaultError) {
	return buildAssignmentModel(pageData{
		ID:           a.ID,
		Iid:          a.Iid,
		WorkspaceID:  a.WorkspaceID,
		ParentID:     a.ParentID,
		Title:        a.Title,
		Icon:         a.Icon,
		Type:         a.Type,
		Properties:   a.Properties,
		CreatedBy:    a.CreatedBy,
		CreatedAt:    a.CreatedAt,
		UpdatedAt:    a.UpdatedAt,
		UserIid:      a.UserIid,
		ParentIid:    a.ParentIid,
		WorkspaceIid: a.WorkspaceIid,
	})
}

func mapDbUpdateToModel(a db.UpdatePageRow) (*models.PageDetailResponse, *herodot.DefaultError) {
	return buildAssignmentModel(pageData{
		ID:           a.ID,
		Iid:          a.Iid,
		WorkspaceID:  a.WorkspaceID,
		ParentID:     a.ParentID,
		Title:        a.Title,
		Icon:         a.Icon,
		Type:         a.Type,
		Properties:   a.Properties,
		CreatedBy:    a.CreatedBy,
		CreatedAt:    a.CreatedAt,
		UpdatedAt:    a.UpdatedAt,
		UserIid:      a.UserIid,
		ParentIid:    a.ParentIid,
		WorkspaceIid: a.WorkspaceIid,
	})
}
