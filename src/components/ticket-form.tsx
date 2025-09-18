

"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "./ui/card";
import type { Template } from "@/app/dashboard/create-ticket/page";
import { toast } from "sonner";
import {
  Loader2,
  Paperclip,
  PlusCircle,
  Trash2,
  UploadCloud,
  UserPlus,
  X,
  Building,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Badge } from "./ui/badge";
import type { Database } from "@/lib/database.types";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import { createTicket } from "@/app/dashboard/create-ticket/_actions/create-ticket";
import { updateTicket } from "@/app/dashboard/tickets/[id]/edit/_actions/update-ticket";
import { useRouter, useSearchParams } from "next/navigation";
import TextEditor from "./text-editor";

type Department = Database["public"]["Tables"]["departments"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"] & {
  departments: Department | null;
};

type Ticket = Database["public"]["Tables"]["internal_tickets"]["Row"] & {
  collaborators: { user_id: string }[];
  ticket_departments: { department_id: string }[];
};

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters." }),
  departmentId: z.string().min(1, { message: "Department is required." }),
  category: z.string().min(1, { message: "Category is required." }),
  priority: z.enum(["low", "medium", "high", "critical"]),
  assigned_to: z.string().min(1, { message: "Assignee is required." }),
  tags: z.array(z.string()).optional(),
  attachment: z.instanceof(File).optional().nullable(),
  collaborators: z.array(z.string()).optional(),
  is_external: z.boolean().optional(),
  crm_ticket_id: z.string().optional().nullable(),
});

export type TicketFormValues = z.infer<typeof formSchema>;

interface TicketFormProps {
  template?: Template | null;
  mode?: "create" | "edit";
  ticket?: Ticket | null;
  crmTicketId?: string | null;
}

const categories = [
  "General Request",
  "IT Support",
  "Customer Support",
  "Finance",
  "HR Request",
  "Security",
  "Risk Management",
];
const priorities = ["low", "medium", "high", "critical"];

export function TicketForm({
  template = null,
  mode = "create",
  ticket = null,
  crmTicketId = null,
}: TicketFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const rawSearchParams = useSearchParams();
    const searchParams = rawSearchParams ?? new URLSearchParams();
  const [loading, setLoading] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [filePreview, setFilePreview] = React.useState<string | null>(null);
  const [tagInput, setTagInput] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [allDepartments, setAllDepartments] = React.useState<Department[]>([]);
  const [users, setUsers] = React.useState<Profile[]>([]);
  const [collaborators, setCollaborators] = React.useState<Profile[]>([]);
  const [assigneePopoverOpen, setAssigneePopoverOpen] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      departmentId: "",
      priority: "medium",
      description: "",
      category: "General Request",
      assigned_to: "auto-assign",
      tags: [],
      collaborators: [],
      attachment: null,
      is_external: false,
      crm_ticket_id: null,
    },
  });

  React.useEffect(() => {
    const initializeForm = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: departmentsData, error: departmentsError } = await supabase
        .from("departments")
        .select("*");
      if (departmentsError) {
        toast.error("Could not fetch departments.");
      } else if (departmentsData) {
        setAllDepartments(departmentsData);
      }

      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*, departments (*)");
      if (usersError) {
        toast.error("Could not fetch users.");
      } else if (usersData) {
        setUsers(usersData as Profile[]);
      }
    };

    initializeForm();
  }, [supabase]);

  React.useEffect(() => {
    if (mode === "edit" && ticket && users.length > 0) {
      const ticketCollaboratorUsers = users.filter((u) =>
        ticket.collaborators.some((c) => c.user_id === u.id)
      );
      setCollaborators(ticketCollaboratorUsers);
      setTags(ticket.tags || []);

      form.reset({
        title: ticket.title,
        departmentId: ticket.ticket_departments[0]?.department_id || "",
        priority: ticket.priority as "low" | "medium" | "high" | "critical",
        description: ticket.description,
        category: ticket.category || "General Request",
        assigned_to: ticket.assigned_to || "auto-assign",
        tags: ticket.tags || [],
        collaborators: ticket.collaborators.map((c) => c.user_id),
        attachment: null, // Attachments cannot be pre-filled
        is_external: ticket.is_external || false,
      });
    }
  }, [mode, ticket, form, users]);

  React.useEffect(() => {
    const initializeCreateForm = async () => {
      if (mode === "create" && allDepartments.length > 0) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const escalatedTitle = searchParams.get("title");
        const escalatedDescription = searchParams.get("description");
        const isEscalation = searchParams.get("is_external") === "true";
        const paramCrmTicketId = searchParams.get("crm_ticket_id");

        form.reset({
          title:
            escalatedTitle ||
            template?.default_title ||
            (template?.title && !template.is_default ? template.title : ""),
          departmentId: template?.department_id || "",
          priority:
            (template?.priority as "low" | "medium" | "high" | "critical") ||
            "medium",
          description: escalatedDescription
            ? `<p>${escalatedDescription}</p>`
            : template?.description
            ? `<p>${template.description}</p><p></p>`
            : "",
          category: template?.category || "General Request",
          assigned_to: "auto-assign",
          tags: template?.tags || [],
          collaborators: [],
          attachment: null,
          is_external: isEscalation,
          crm_ticket_id: paramCrmTicketId,
        });
        setTags(template?.tags || []);
        setCollaborators([]);
        removeFile();
      }
    };
    initializeCreateForm();
  }, [mode, template, form, allDepartments, searchParams, supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      if (selectedFile.size > 1 * 1024 * 1024) { // 1MB limit
        toast.error("File size cannot exceed 1MB.");
        return;
      }
      form.setValue("attachment", selectedFile);
      setFile(selectedFile);
      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setFilePreview(null);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
    form.setValue("attachment", null);
    const fileInput = document.getElementById(
      "attachment-input"
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim() !== "") {
      e.preventDefault();
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      form.setValue("tags", newTags);
      setTagInput("");
    }
  };

  const addTag = () => {
    if (tagInput.trim() !== "") {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      form.setValue("tags", newTags);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    form.setValue("tags", newTags);
  };

  const addCollaborator = (user: Profile) => {
    if (!collaborators.some((c) => c.id === user.id)) {
      const newCollaborators = [...collaborators, user];
      setCollaborators(newCollaborators);
      form.setValue(
        "collaborators",
        newCollaborators.map((c) => c.id)
      );
    }
  };

  const removeCollaborator = (userId: string) => {
    const newCollaborators = collaborators.filter((c) => c.id !== userId);
    setCollaborators(newCollaborators);
    form.setValue(
      "collaborators",
      newCollaborators.map((c) => c.id)
    );
  };

  const formatRole = (role: string | undefined | null) => {
    if (!role) return "";
    return role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getAssigneeLabel = (assignToValue: string | undefined) => {
    if (!assignToValue || assignToValue === "auto-assign") {
      return "Auto-assign";
    }
    const user = users.find((u) => u.id === assignToValue);
    if (!user) return "Unknown User";
    return user.full_name ?? user.username ?? user.email ?? "Unknown User";
  };
  
  const selectedDepartmentId = form.watch("departmentId");

  const availableUsersForAssignment = React.useMemo(() => {
    if (!selectedDepartmentId) {
      return users.filter(u => u.role === 'department_head');
    }
    return users.filter(u => u.role === 'department_head' && u.department_id === selectedDepartmentId);
  }, [users, selectedDepartmentId]);
  
  const availableUsersForCollaboration = users.filter(
    (u) => u.id !== currentUser?.id && !collaborators.some((c) => c.id === u.id)
  );

  const onSubmit = async (values: TicketFormValues) => {
    setLoading(true);

    const finalValues = { ...values };
    if (crmTicketId) {
      finalValues.is_external = true;
      finalValues.crm_ticket_id = crmTicketId;
    }

    const formData = new FormData();
    Object.entries(finalValues).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (
          key === "tags" ||
          key === "collaborators"
        ) {
          if (Array.isArray(value)) {
            value.forEach((item) => formData.append(`${key}[]`, item));
          }
        } else if (key === "attachment" && value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      }
    });

    let result;
    if (mode === "edit" && ticket) {
       result = await updateTicket(ticket.id, formData);
      if (result.success) {
        toast.success("Ticket updated successfully!");
      } else {
        toast.error(result.message);
      }
    } else {
      result = await createTicket(formData);
      if (result.success && result.ticketId) {
        toast.success(result.message);
        router.push(`/dashboard/tickets/${result.ticketId}`);
        form.reset();
        removeFile();
        setTags([]);
        setTagInput("");
        setCollaborators([]);
      } else {
        toast.error(result.message);
      }
    }

    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {template
            ? `New Ticket: ${template.title}`
            : mode === "edit"
            ? `Editing Ticket`
            : "Create Custom Ticket"}
        </CardTitle>
        <CardDescription>
          {template
            ? `Based on the "${template.departments?.name}" template. Please fill in the details below.`
            : "Please fill out the form to create a new ticket."}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
            {/* Section 1: Basic Information */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold">
                  1
                </div>
                <h3 className="text-lg font-semibold">Basic Information</h3>
              </div>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Ticket Title <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Unable to access trading platform"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <TextEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Please describe the issue in detail..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section 2: Categorization */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold">
                  2
                </div>
                <h3 className="text-lg font-semibold">Categorization</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Department <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allDepartments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>
                        Category <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Priority <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a priority level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priorities.map((p) => (
                            <SelectItem
                              key={p}
                              value={p}
                              className="capitalize"
                            >
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assigned_to"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>
                        Assign To <span className="text-destructive">*</span>
                      </FormLabel>
                      <Popover
                        open={assigneePopoverOpen}
                        onOpenChange={setAssigneePopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {getAssigneeLabel(field.value)}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                          <Command>
                            <CommandInput placeholder="Search users..." />
                            <CommandList>
                              <CommandEmpty>No results found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="auto-assign"
                                  onSelect={() => {
                                    form.setValue("assigned_to", "auto-assign");
                                    setAssigneePopoverOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === "auto-assign"
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  Auto-assign
                                </CommandItem>
                              </CommandGroup>
                              <CommandGroup heading="Users">
                                {availableUsersForAssignment.map((user) => (
                                  <CommandItem
                                    value={user.id}
                                    key={user.id}
                                    onSelect={() => {
                                      form.setValue("assigned_to", user.id);
                                      setAssigneePopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === user.id
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage
                                          src={user.avatar_url ?? ""}
                                        />
                                        <AvatarFallback>
                                          {getInitials(
                                            user.full_name,
                                            user.username
                                          )}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex items-baseline gap-2">
                                        <span>
                                          {user.full_name ?? user.username}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {user.departments?.name}
                                        </span>
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section 3: Additional Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold">
                  3
                </div>
                <h3 className="text-lg font-semibold">Additional Details</h3>
              </div>
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add custom tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    <PlusCircle className="h-4 w-4 mr-2" /> Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-sm font-normal"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </FormItem>

              <FormItem>
                <FormLabel>Collaborators</FormLabel>
                <div className="flex flex-wrap gap-2 items-center">
                  {collaborators.map((c) => (
                    <Badge
                      key={c.id}
                      variant="outline"
                      className="text-sm font-normal gap-2 p-2 rounded-full"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={c.avatar_url ?? ""} />
                        <AvatarFallback>
                          {getInitials(c.full_name, c.username)}
                        </AvatarFallback>
                      </Avatar>
                      {c.full_name ?? c.username}
                      <button
                        type="button"
                        onClick={() => removeCollaborator(c.id)}
                        className="ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                      >
                        <UserPlus className="h-4 w-4" /> Add Member
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[300px]" align="start">
                      <Command>
                        <CommandInput placeholder="Search users..." />
                        <CommandList>
                          <CommandEmpty>No users found.</CommandEmpty>
                          <CommandGroup>
                            {availableUsersForCollaboration.map((user) => (
                              <CommandItem
                                key={user.id}
                                onSelect={() => addCollaborator(user)}
                                className="flex items-center gap-2"
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.avatar_url ?? ""} />
                                  <AvatarFallback>
                                    {getInitials(user.full_name, user.username)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {user.full_name ?? user.username}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatRole(user.role)}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </FormItem>

              <FormField
                control={form.control}
                name="attachment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attachments</FormLabel>
                    <FormControl>
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="attachment-input"
                          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground">
                              <span className="font-semibold">
                                Click to upload
                              </span>{" "}
                              or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PDF, DOC, XLS, TXT, Images (MAX. 1MB)
                            </p>
                          </div>
                          <Input
                            id="attachment-input"
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {ticket?.attachment_url && mode === "edit" && (
                        <span>
                          Current attachment:{" "}
                          <a
                            href={ticket.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            {ticket.attachment_url.split("/").pop()}
                          </a>
                          . Uploading a new file will replace it.
                        </span>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {file && (
                <div className="mt-4 relative w-48 h-48">
                    {filePreview ? (
                        <img
                            src={filePreview}
                            alt="File preview"
                            className="w-full h-full object-cover rounded-md border"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted rounded-md border">
                            <Paperclip className="h-12 w-12 text-muted-foreground" />
                        </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2 text-white text-xs rounded-b-md">
                        <p className="font-bold truncate">{file.name}</p>
                        <p>{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={removeFile}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              disabled={loading || !form.formState.isValid}
              size="lg"
              className="mt-4"
            >
              {loading && <Loader2 className="animate-spin mr-2" />}
              {mode === "edit" ? "Update Ticket" : "Submit Ticket"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
