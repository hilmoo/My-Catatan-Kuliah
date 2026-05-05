import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/c/$courseId/n/$notesId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/$workspaceId/n/$notesId"!</div>
}
