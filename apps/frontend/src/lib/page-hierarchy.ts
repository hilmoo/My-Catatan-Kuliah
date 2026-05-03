import { ListPagesType } from "~/api/model/listPagesType";

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

// Hierarchy rules:
// - folder: top-level OR inside folder
// - course: only inside folder
// - assignment: only inside course (never top-level)
// - note: inside folder, course, or note
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
    return ALL_PAGE_TYPES.filter((t) => canCreateAtTopLevel(t));
  }
  return ALL_PAGE_TYPES.filter((t) => canCreateUnder(parent, t));
}

export function defaultPropertiesForType(type: PageType): Record<string, unknown> | undefined {
  switch (type) {
    case "assignment":
      return { status: "todo" };
    case "course":
      return { semester: "Current semester" };
    case "note":
      return { tags: ["kuliah"] };
    case "folder":
      return { color: "teal" };
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
