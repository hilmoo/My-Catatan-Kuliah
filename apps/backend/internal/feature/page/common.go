package page

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	"backend/internal/transport/validation"
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/ory/herodot"
)

type getParentIdParams struct {
	queries   *db.Queries
	pageType  models.PageCreateType
	parentIid *uuid.UUID
	targetId  uuid.UUID
	userId    int32
}

func getPageParentId(ctx context.Context, args getParentIdParams) (*int32, error) {
	if args.parentIid == nil {
		if args.pageType == models.PageCreateTypeAssignment {
			return nil, herodot.ErrBadRequest.WithReasonf("assignment page requires a parent")
		}
		return nil, nil
	}

	switch args.pageType {
	case models.PageCreateTypeFolder:
		parentId, err := args.queries.GetPageFolderIdByIidAndUserForParent(ctx, db.GetPageFolderIdByIidAndUserForParentParams{
			Iid:       args.targetId,
			CreatedBy: args.userId,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to get folder parent: %w", err)
		}
		return &parentId, nil

	case models.PageCreateTypeCourse:
		parentId, err := args.queries.GetPageCourseIdByIidAndUserForParent(ctx, db.GetPageCourseIdByIidAndUserForParentParams{
			Iid:       args.targetId,
			CreatedBy: args.userId,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to get course parent: %w", err)
		}
		return &parentId, nil

	case models.PageCreateTypeNote:
		parentId, err := args.queries.GetPageNoteIdByIidAndUserForParent(ctx, db.GetPageNoteIdByIidAndUserForParentParams{
			Iid:       args.targetId,
			CreatedBy: args.userId,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to get note parent: %w", err)
		}
		return &parentId, nil

	case models.PageCreateTypeAssignment:
		parentId, err := args.queries.GetPageAssignmentIdByIidAndUserForParent(ctx, db.GetPageAssignmentIdByIidAndUserForParentParams{
			Iid:       args.targetId,
			CreatedBy: args.userId,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to get assignment parent: %w", err)
		}
		return &parentId, nil

	default:
		return nil, fmt.Errorf("unsupported page type: %s", args.pageType)
	}
}

type httpMarshalValidatePropertiesParams struct {
	vld      *validation.Vld
	GetProps func() (any, error)
	pageType models.PageCreateType
}

func httpMarshalValidateProperties(args httpMarshalValidatePropertiesParams) ([]byte, *herodot.DefaultError) {
	props, err := args.GetProps()
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReasonf("invalid %s properties: %v", args.pageType, err)
	}

	switch p := props.(type) {
	case *models.PagePropertiesFolder:
		if errH := validation.ValidatePayload(args.vld, p); errH != nil {
			return nil, errH
		}
	case *models.PagePropertiesCourse:
		if errH := validation.ValidatePayload(args.vld, p); errH != nil {
			return nil, errH
		}
	case *models.PagePropertiesNote:
		if errH := validation.ValidatePayload(args.vld, p); errH != nil {
			return nil, errH
		}
	case *models.PagePropertiesAssignment:
		if errH := validation.ValidatePayload(args.vld, p); errH != nil {
			return nil, errH
		}
	default:
		return nil, herodot.ErrBadRequest.WithReasonf("unsupported page type: %s", args.pageType)
	}

	byteProps, err := json.Marshal(props)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReasonf("failed to marshal %s properties: %v", args.pageType, err)
	}

	return byteProps, nil
}
