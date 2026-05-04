import { ListPagesType } from "@/api/model/listPagesType";
import type { PageAllProperties } from "@/api/model/pageAllProperties";
import { PagePropertiesAssignmentStatus } from "@/api/model/pagePropertiesAssignmentStatus";
import { PagePropertiesAssignmentType } from "@/api/model/pagePropertiesAssignmentType";
import { PagePropertiesCourseType } from "@/api/model/pagePropertiesCourseType";
import { PagePropertiesFolderType } from "@/api/model/pagePropertiesFolderType";
import { PagePropertiesNoteType } from "@/api/model/pagePropertiesNoteType";

export type PageType = keyof typeof ListPagesType;

export const ALL_PAGE_TYPES: PageType[] = ["folder", "course", "assignment", "note"];

export const PAGE_TYPE_LABEL: Record<PageType, string> = {
  folder: "Folder",
  course: "Course",
  assignment: "Assignment",
  note: "Note",
};

export const PAGE_TYPE_PLURAL: Record<PageType, string> = {
  folder: "Folders",
  course: "Courses",
  assignment: "Assignments",
  note: "Notes",
};

export function canCreateAtTopLevel(child: PageType): boolean {
  return child === "folder" || child === "note";
}

export function canCreateUnder(parent: PageType, child: PageType): boolean {
  switch (child) {
    case "folder":
      return parent === "folder";
    case "course":
      return parent === "folder";
    case "assignment":
      return parent === "course";
    case "note":
      return parent === "folder" || parent === "course" || parent === "note";
    default:
      return false;
  }
}

export function allowedChildren(parent: PageType | null): PageType[] {
  if (parent === null) {
    return ALL_PAGE_TYPES.filter((type) => canCreateAtTopLevel(type));
  }
  return ALL_PAGE_TYPES.filter((type) => canCreateUnder(parent, type));
}

export function defaultPropertiesForType(type: PageType): PageAllProperties | undefined {
  switch (type) {
    case "assignment":
      return {
        type: PagePropertiesAssignmentType.assignment,
        status: PagePropertiesAssignmentStatus.todo,
      };
    case "course":
      return {
        type: PagePropertiesCourseType.course,
        semester: "Current semester",
      };
    case "note":
      return {
        type: PagePropertiesNoteType.note,
        tags: ["kuliah"],
      };
    case "folder":
      return {
        type: PagePropertiesFolderType.folder,
        color: "#2f6f68",
      };
    default:
      return undefined;
  }
}

export function defaultIconForType(type: PageType): string {
  switch (type) {
    case "folder":
      return "📁";
    case "course":
      return "🎓";
    case "assignment":
      return "📝";
    case "note":
      return "📘";
  }
}
