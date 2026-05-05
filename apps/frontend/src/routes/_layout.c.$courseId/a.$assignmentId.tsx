import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/c/$courseId/a/$assignmentId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/$workspaceId/a/$courseId"!</div>
}
