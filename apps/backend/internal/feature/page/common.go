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

	if errH := validation.ValidatePayload(args.vld, &props); errH != nil {
		return nil, errH
	}

	byteProps, err := json.Marshal(props)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReasonf("failed to marshal %s properties: %v", args.pageType, err)
	}

	return byteProps, nil
}
