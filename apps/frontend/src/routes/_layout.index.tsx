import {
  getWorkspacesServiceListWorkspacesQueryOptions,
  useWorkspacesServiceCreateWorkspace,
  getWorkspacesServiceListWorkspacesQueryKey,
} from "@/api/workspaces/workspaces";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WorkspacesServiceCreateWorkspaceBody } from "@/api/workspaces/workspaces.zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { BuildingIcon, PlusIcon } from "lucide-react";

export const Route = createFileRoute("/_layout/")({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const workspaces = await queryClient.ensureQueryData(
      getWorkspacesServiceListWorkspacesQueryOptions(),
    );

    if (workspaces.status !== 200) {
      throw new Error("Failed to load workspaces");
    }

    if (workspaces.data.length !== 0) {
      throw redirect({ to: "/$workspaceId", params: { workspaceId: workspaces.data[0]?.id } });
    }
  },
});

function RouteComponent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const createWorkspaceMutation = useWorkspacesServiceCreateWorkspace();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(WorkspacesServiceCreateWorkspaceBody),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = handleSubmit((data) => {
    createWorkspaceMutation.mutate(
      { data },
      {
        onSuccess: (response) => {
          queryClient.invalidateQueries({
            queryKey: getWorkspacesServiceListWorkspacesQueryKey(),
          });
          if (response.status === 201) {
            navigate({
              to: "/$workspaceId",
              params: { workspaceId: response.data.id },
            });
          }
        },
      },
    );
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md shadow-lg border-2 border-primary/5">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <BuildingIcon className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Welcome to Catatan Kuliah
          </CardTitle>
          <CardDescription className="text-base">
            You do&apos;t have any workspaces yet. Create your first one to start organizing your
            courses and notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <Field>
              <FieldLabel>Workspace Name</FieldLabel>
              <Input
                {...register("name")}
                placeholder="e.g. My University, Semester 1, etc."
                className="h-11"
              />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium transition-all hover:scale-[1.01]"
              disabled={createWorkspaceMutation.isPending}
            >
              {createWorkspaceMutation.isPending ? (
                "Creating Workspace..."
              ) : (
                <>
                  <PlusIcon className="mr-2 size-5" />
                  Create Workspace
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
