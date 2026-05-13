import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PencilIcon, ChevronDownIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldTitle, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/editor/theme/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AssignmentsAssignmentStatus } from "@/api/model/assignmentsAssignmentStatus";
import {
  useAssignmentsServiceUpdateAssignment,
  getAssignmentsServiceGetAssignmentQueryKey,
  getAssignmentsServiceListAssignmentsQueryKey,
} from "@/api/assignments/assignments";
import type { AssignmentsResponse } from "@/api/model/assignmentsResponse";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  due_date: z.date({
    required_error: "Due date is required",
  }),
  status: z.nativeEnum(AssignmentsAssignmentStatus),
  content: z.string().optional(),
  color: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface UpdateAssignmentDialogProps {
  assignment: AssignmentsResponse;
}

export function UpdateAssignmentDialog({ assignment }: UpdateAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const updateAssignment = useAssignmentsServiceUpdateAssignment();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: assignment.title,
      due_date: new Date(assignment.due_date),
      status: assignment.status,
      content: "", // We might not want to update content here if it's in the editor
      color: assignment.color || "#000000",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await updateAssignment.mutateAsync({
        assignmentId: assignment.id,
        data: {
          ...values,
          due_date: values.due_date.toISOString(),
        },
      });
      queryClient.invalidateQueries({
        queryKey: getAssignmentsServiceGetAssignmentQueryKey(assignment.id),
      });
      queryClient.invalidateQueries({
        queryKey: getAssignmentsServiceListAssignmentsQueryKey(assignment.course_id),
      });
      setOpen(false);
    } catch (error) {
      console.error("Failed to update assignment", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PencilIcon className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Assignment</DialogTitle>
          <DialogDescription>Modify the assignment details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <Field>
            <FieldTitle>Title</FieldTitle>
            <Input {...form.register("title")} placeholder="Assignment title" />
            <FieldError errors={[form.formState.errors.title]} />
          </Field>

          <Field>
            <FieldTitle>Color</FieldTitle>
            <Input {...form.register("color")} type="color" className="h-10 p-1" />
            <FieldError errors={[form.formState.errors.color]} />
          </Field>

          <Field>
            <FieldTitle>Due Date</FieldTitle>
            <Controller
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      data-empty={!field.value}
                      className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <ChevronDownIcon />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                  </PopoverContent>
                </Popover>
              )}
            />
            <FieldError errors={[form.formState.errors.due_date]} />
          </Field>

          <Field>
            <FieldTitle>Status</FieldTitle>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={AssignmentsAssignmentStatus.Todo}>To Do</SelectItem>
                      <SelectItem value={AssignmentsAssignmentStatus.InProgress}>
                        In Progress
                      </SelectItem>
                      <SelectItem value={AssignmentsAssignmentStatus.Done}>Done</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[form.formState.errors.status]} />
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
