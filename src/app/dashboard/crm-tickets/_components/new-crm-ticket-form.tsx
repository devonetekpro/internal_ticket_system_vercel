

'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Paperclip, UploadCloud, Trash2, X, User, Check, ChevronsUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import TextEditor from '@/components/text-editor';
import { createCrmTicketAction } from '../new/_actions/create-crm-ticket-action';
import { type CrmCategory, type CrmUser, searchCrmUsersByExpression, searchCrmUserById } from '@/services/crm-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Profile } from '@/lib/database.types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useDebounce } from 'use-debounce';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const formSchema = z.object({
  title: z.string().min(1, { message: 'Title is required.' }),
  text: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  category: z.string().min(1, { message: 'Category is required.' }),
  user: z.number().min(1, { message: 'Client is required.' }),
  attachment: z.instanceof(File).optional().nullable(),
});

type NewCrmTicketFormValues = z.infer<typeof formSchema>;

interface NewCrmTicketFormProps {
    categories: CrmCategory[];
    currentUserProfile: Pick<Profile, 'crm_manager_id'>;
}

export function NewCrmTicketForm({ categories, currentUserProfile }: NewCrmTicketFormProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [filePreview, setFilePreview] = React.useState<string | null>(null);
  
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = React.useState<CrmUser[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<CrmUser | null>(null);

  const form = useForm<NewCrmTicketFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      text: '',
      category: '',
      user: 0,
      attachment: null,
    },
  });
  
  React.useEffect(() => {
    const performSearch = async () => {
        if (!debouncedSearchQuery) {
            if (!selectedUser) setSearchResults([]);
            return;
        }
        setIsSearching(true);
        const isNumeric = /^\d+$/.test(debouncedSearchQuery);
        let users: CrmUser[] = [];
        if (isNumeric) {
            users = await searchCrmUserById(debouncedSearchQuery);
        } else {
            users = await searchCrmUsersByExpression(debouncedSearchQuery);
        }
        setSearchResults(users);
        setIsSearching(false);
    };
    performSearch();
  }, [debouncedSearchQuery, selectedUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("File size cannot exceed 10MB.");
        return;
      }
      form.setValue('attachment', selectedFile);
      setFile(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
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
    form.setValue('attachment', null);
    const fileInput = document.getElementById('attachment-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const onSubmit = async (values: NewCrmTicketFormValues) => {
    setLoading(true);

    if (!currentUserProfile.crm_manager_id) {
        toast.error("Your user profile is not linked to a CRM manager ID. Cannot create ticket.");
        setLoading(false);
        return;
    }

    const formData = new FormData();
    formData.append('title', values.title);
    formData.append('text', values.text);
    formData.append('category', values.category);
    formData.append('user', values.user.toString());
    formData.append('manager', currentUserProfile.crm_manager_id.toString());
    
    if (values.attachment) {
        const base64file = await fileToBase64(values.attachment);
        formData.append('attachmentName', values.attachment.name);
        formData.append('attachmentFile', base64file);
    }
    
    const result = await createCrmTicketAction(formData);

    if (result.success && result.ticketId) {
      toast.success('CRM Ticket created successfully!');
      router.push(`/dashboard/crm-tickets/${result.ticketId}`);
    } else {
      toast.error(result.message);
    }

    setLoading(false);
  };

  const getSelectedUserLabel = () => {
    if (selectedUser) {
        return `${selectedUser.firstName} ${selectedUser.lastName} (${selectedUser.email})`;
    }
    const userId = form.getValues('user');
    if (userId) {
        const user = searchResults.find(u => u.id === userId);
        if (user) return `${user.firstName} ${user.lastName} (${user.email})`;
    }
    return "Search client by ID or name...";
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8 pt-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticket Title <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Problem with withdrawal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-destructive">*</span></FormLabel>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="user"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Client <span className="text-destructive">*</span></FormLabel>
                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
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
                                  {getSelectedUserLabel()}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                               <Command>
                                  <CommandInput 
                                      placeholder="Search client by ID or name..."
                                      value={searchQuery}
                                      onValueChange={setSearchQuery}
                                  />
                                  <CommandList>
                                      {isSearching && <div className="p-2">Searching...</div>}
                                      <CommandEmpty>No client found.</CommandEmpty>
                                      <CommandGroup>
                                          {searchResults.map(user => (
                                              <CommandItem
                                                  value={`${user.id} ${user.firstName} ${user.lastName} ${user.email}`}
                                                  key={user.id}
                                                  onSelect={() => {
                                                      field.onChange(user.id);
                                                      setSelectedUser(user);
                                                      setPopoverOpen(false);
                                                  }}
                                              >
                                                 <Check className={cn("mr-2 h-4 w-4", user.id === field.value ? "opacity-100" : "opacity-0")}/>
                                                 <div className="flex flex-col">
                                                     <span>{user.firstName} {user.lastName}</span>
                                                     <span className="text-xs text-muted-foreground">{user.email}</span>
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
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.title}>
                              {cat.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
             <FormField
                control={form.control}
                name="attachment"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Attachments</FormLabel>
                    <FormControl>
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="attachment-input" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-muted-foreground">Images or documents (MAX. 10MB)</p>
                                </div>
                                <Input id="attachment-input" type="file" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div> 
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            {filePreview && (
                <div className="mt-4 relative w-48 h-48">
                    <img src={filePreview} alt="File preview" className="w-full h-full object-cover rounded-md border" />
                    <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={removeFile}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
            {file && !filePreview && (
                <div className="mt-4 flex items-center p-2 bg-muted rounded-md text-sm border">
                    <Paperclip className="h-4 w-4 mr-2" />
                    <span className="flex-grow truncate">{file.name} - {(file.size / 1024 / 1024).toFixed(2)}MB</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full ml-2" onClick={removeFile}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
            )}
          </CardContent>

          <CardFooter>
            <Button type="submit" disabled={loading || !form.formState.isValid} size="lg">
              {loading && <Loader2 className="animate-spin mr-2" />}
              Create Ticket
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
