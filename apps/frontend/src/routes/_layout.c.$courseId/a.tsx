import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/c/$courseId/a')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_layout/c/$courseId/a"!</div>
}
