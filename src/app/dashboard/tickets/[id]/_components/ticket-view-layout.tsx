
'use client'

import React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials, cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Paperclip,
  Tag,
  Users,
  MessageSquare,
  Reply,
  Eye,
  UserPlus,
  X,
  File,
  Building,
  ChevronsUpDown,
  Download,
  Loader2,
  ClipboardCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import TicketCommentForm from './ticket-comment-form'
import type { TicketDetails, CommentWithProfiles, TicketCollaboratorWithProfile } from '../page'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import Image from 'next/image'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { updateCollaborators } from '../_actions/update-collaborators'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { addTicketToTaskBoard } from '@/app/dashboard/tasks/_actions/task-actions'
import { usePermissions } from '@/components/providers/permissions-provider'


type ProfileStub = {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
}

interface TicketViewLayoutProps {
    ticket: TicketDetails
    currentUser: SupabaseUser
    allUsers: ProfileStub[]
    userRole: string | null
    replyingTo: CommentWithProfiles | null
    onSetReplyingTo: (comment: CommentWithProfiles | null) => void
    onCommentPosted: (comment: CommentWithProfiles) => void
    onCollaboratorsChange: (collaborators: TicketCollaboratorWithProfile[]) => void
    showActivityFeed?: boolean
    isTicketOnBoard: boolean
}

const isImage = (url: string) => /\.(jpeg|jpg|gif|png|webp)$/i.test(url);
const isVideo = (url: string) => /\.(mp4|webm|ogg)$/i.test(url);

const AttachmentPreview = ({ url }: { url: string }) => {
    if (isImage(url)) {
        return <Image src={url} alt="Attachment" width={800} height={600} className="rounded-md object-contain max-h-[60vh]" />;
    }
    if (isVideo(url)) {
        return <video src={url} controls className="rounded-md w-full max-h-[60vh]" />;
    }
    
    const fileName = url.split('/').pop()?.split('?')[0] ?? 'attachment';

    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 bg-muted rounded-md h-64">
        <File className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground font-medium text-center">{fileName}</p>
        <p className="text-sm text-muted-foreground">This file type cannot be previewed.</p>
        <Button asChild>
          <a href={url} download target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-4 w-4" />
            Download
          </a>
        </Button>
      </div>
    );
}

const Comment = ({
  comment,
  currentUser,
  onSetReplyingTo,
  isReplying,
  canComment,
}: {
  comment: CommentWithProfiles,
  currentUser: SupabaseUser,
  onSetReplyingTo: (comment: CommentWithProfiles) => void
  isReplying: boolean,
  canComment: boolean,
}) => {
  const isSystemComment = !comment.profiles;
  const viewers = comment.comment_views?.filter(v => v.user_id !== comment.user_id && v.profiles) ?? [];
  const hasBeenViewed = viewers.length > 0;
  
  const isOwnComment = comment.user_id === currentUser.id;
  const isUnread = !isOwnComment && !(comment.comment_views?.some(v => v.user_id === currentUser.id));


  const getAvatar = () => {
      if (isSystemComment) {
          return (
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-muted-foreground"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 2a10 10 0 1 0 10 10"/></svg>
            </div>
          )
      }
      return (
          <Avatar className="h-10 w-10">
              <AvatarImage src={comment.profiles?.avatar_url ?? undefined} />
              <AvatarFallback>{getInitials(comment.profiles?.full_name, comment.profiles?.username)}</AvatarFallback>
          </Avatar>
      )
  }

  const mainContent = React.useMemo(() => {
    const doc = new DOMParser().parseFromString(comment.content, 'text/html');
    const blockquote = doc.querySelector('blockquote');
    if (blockquote) {
      blockquote.className = 'prose prose-sm dark:prose-invert max-w-none text-muted-foreground bg-muted/50 p-3 border-l-4 border-muted-foreground/50 rounded-md';
      // Adjust nested p tags for better styling
      blockquote.querySelectorAll('p').forEach(p => {
          p.className = 'my-1';
      });
      // Style the header of the quote
      const header = blockquote.querySelector('p:first-child');
      if (header) {
        header.className = 'text-xs text-muted-foreground mb-2';
      }
    }
    return doc.body.innerHTML;
  }, [comment.content]);
  

  return (
     <div className={cn(
        "relative flex items-start gap-x-4 transition-colors duration-200 p-4 rounded-lg -mx-4",
        isReplying && "bg-primary/10",
        isUnread && "bg-blue-500/5",
      )}>
        {isUnread && <div className="absolute top-1/2 -translate-y-1/2 -left-2 h-2 w-2 rounded-full bg-blue-500" />}
        {getAvatar()}
        <div className="flex-1">
            <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{comment.profiles?.full_name ?? 'System Event'}</span>
                <span className="text-xs text-muted-foreground" title={format(new Date(comment.created_at), 'PPpp')}>
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
                {hasBeenViewed && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs font-medium">Seen by:</p>
                        <ul className="text-xs list-disc list-inside">
                          {viewers.map(v => (
                            <li key={v.user_id}>{v.profiles?.full_name ?? v.profiles?.username ?? 'Anonymous'}</li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
            </div>
            <div className="text-sm text-foreground space-y-2 mt-1">
                 <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: mainContent }} />
                {comment.attachment_url && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="mt-2">
                                <Paperclip className="h-4 w-4 mr-2" />
                                View Attachment
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                            <DialogHeader>
                                <DialogTitle>Attachment Preview</DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                               <AttachmentPreview url={comment.attachment_url} />
                            </div>
                            <DialogFooter>
                                <a href={comment.attachment_url} download target="_blank" rel="noopener noreferrer">
                                    <Button>
                                        <Download className="mr-2 h-4 w-4" />
                                        Download
                                    </Button>
                                </a>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
            {!isSystemComment && canComment && (
                 <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 -ml-2 mt-1 text-muted-foreground hover:text-primary"
                    onClick={() => onSetReplyingTo(comment)}
                >
                    <Reply className="h-3 w-3 mr-1" />
                    Reply
                </Button>
            )}
        </div>
     </div>
  )
}

const CollaboratorManager = ({ ticket, allUsers, onCollaboratorsChange }: { 
    ticket: TicketDetails, 
    allUsers: ProfileStub[], 
    onCollaboratorsChange: (collaborators: TicketCollaboratorWithProfile[]) => void
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setSelectedUserIds(ticket.collaborators.map(c => c.user_id));
        }
    }, [isOpen, ticket.collaborators]);

    const handleUpdateCollaborators = async () => {
        setIsSaving(true);
        const result = await updateCollaborators(ticket.id, selectedUserIds);
        if (result.success && result.collaborators) {
            toast.success(result.message);
            onCollaboratorsChange(result.collaborators as TicketCollaboratorWithProfile[]);
            setIsOpen(false);
        } else {
            toast.error(result.message);
        }
        setIsSaving(false);
    }

    const availableUsers = allUsers.filter(u => 
        u.id !== ticket.created_by &&
        u.id !== ticket.assigned_to
    );

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className='h-6 w-6 text-muted-foreground'>
                    <UserPlus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Collaborators</DialogTitle>
                </DialogHeader>
                <Command>
                    <CommandInput placeholder="Search users..." />
                    <ScrollArea className="h-64">
                        <CommandList>
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup>
                                {availableUsers.map(user => (
                                    <CommandItem key={user.id} onSelect={(e) => e.preventDefault()} className="p-0">
                                        <div className="flex items-center gap-3 w-full p-2 cursor-pointer" onClick={() => {
                                             setSelectedUserIds(prev => 
                                                prev.includes(user.id) 
                                                    ? prev.filter(id => id !== user.id) 
                                                    : [...prev, user.id]
                                            )
                                        }}>
                                            <Checkbox
                                                checked={selectedUserIds.includes(user.id)}
                                                readOnly
                                            />
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.avatar_url ?? ''} />
                                                <AvatarFallback>{getInitials(user.full_name, user.username)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{user.full_name ?? user.username}</span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </ScrollArea>
                </Command>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateCollaborators} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Collaborators
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const INITIAL_COMMENTS_TO_SHOW = 10;

export default function TicketViewLayout({ 
    ticket, 
    currentUser, 
    allUsers, 
    userRole, 
    replyingTo, 
    onSetReplyingTo, 
    onCommentPosted,
    onCollaboratorsChange,
    showActivityFeed = true,
    isTicketOnBoard,
}: TicketViewLayoutProps) {
  const [showAllComments, setShowAllComments] = React.useState(false);
  const [isAddingToBoard, setIsAddingToBoard] = React.useState(false);
  const { hasPermission } = usePermissions();

  const getAssigneeName = (ticket: TicketDetails) => {
    if (ticket.assigned_to_profile) return ticket.assigned_to_profile.full_name ?? ticket.assigned_to_profile.username
    return 'Unassigned'
  }
  
  const getAssigneeAvatar = (ticket: TicketDetails) => {
    if (ticket.assigned_to_profile) return ticket.assigned_to_profile.avatar_url
    return null
  }
  
  const getAssigneeInitials = (ticket: TicketDetails) => {
     if (ticket.assigned_to_profile) return getInitials(ticket.assigned_to_profile.full_name, ticket.assigned_to_profile.username)
     return '?'
  }

 const comments = React.useMemo(() => {
    return ticket.comments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [ticket.comments]);

  const visibleComments = showAllComments ? comments : comments.slice(-INITIAL_COMMENTS_TO_SHOW);
  const hiddenCommentsCount = comments.length - visibleComments.length;

  const handleRemoveCollaborator = async (userId: string) => {
    const currentIds = ticket.collaborators.map(c => c.user_id).filter(id => id !== userId);
    const result = await updateCollaborators(ticket.id, currentIds);
    if (result.success && result.collaborators) {
      toast.success("Collaborator removed.");
      onCollaboratorsChange(result.collaborators as TicketCollaboratorWithProfile[]);
    } else {
      toast.error(result.message);
    }
  }

  const handleAddToBoard = async () => {
    setIsAddingToBoard(true);
    const result = await addTicketToTaskBoard(ticket.id, ticket.title);
    if (result.success) {
      toast.success('Ticket added to board!');
    } else {
      toast.error(result.message);
    }
    setIsAddingToBoard(false);
  };

  const mentionableUsers = React.useMemo(() => {
    const involvedUserIds = new Set<string>();
    
    if (ticket.created_by_profile) involvedUserIds.add(ticket.created_by_profile.id);
    if (ticket.assigned_to_profile) involvedUserIds.add(ticket.assigned_to_profile.id);
    ticket.collaborators.forEach(c => { if(c.profiles) involvedUserIds.add(c.profiles.id); });
    involvedUserIds.delete(currentUser.id);

    // Return a list of full profile objects for the mention list component
    return allUsers.filter(u => involvedUserIds.has(u.id));
  }, [ticket, currentUser, allUsers]);

  const canCommentAndInteract = React.useMemo(() => {
    if (!userRole) return false;
    // Admins and high-level roles can always comment
    if (['system_admin', 'admin', 'manager', 'department_head', 'ceo'].includes(userRole)) {
      return true;
    }
    // Users can comment if they are the creator, assignee, or a collaborator
    const isCreator = ticket.created_by === currentUser.id;
    const isAssignee = ticket.assigned_to === currentUser.id;
    const isCollaborator = ticket.collaborators.some(c => c.user_id === currentUser.id);

    return isCreator || isAssignee || isCollaborator;
  }, [userRole, ticket, currentUser]);


  const MainContent = () => (
     <div className="lg:col-span-2 grid gap-8">
          <Card>
              <CardHeader>
                  <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none text-foreground">
                  <div dangerouslySetInnerHTML={{ __html: ticket.description }} />
              </CardContent>
              {ticket.attachment_url && (
                <CardFooter>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Paperclip className="mr-2 h-4 w-4" />
                                View Attachment
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                             <DialogHeader>
                                <DialogTitle>Attachment Preview</DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                               <AttachmentPreview url={ticket.attachment_url} />
                            </div>
                            <DialogFooter>
                                <a href={ticket.attachment_url} download target="_blank" rel="noopener noreferrer">
                                    <Button>
                                        <Download className="mr-2 h-4 w-4" />
                                        Download
                                    </Button>
                                </a>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardFooter>
              )}
          </Card>

          {showActivityFeed && (
            <>
              <div className="space-y-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="h-6 w-6"/> Activity</h2>
                  <div className="space-y-2">
                    {comments.length > 0 ? (
                        <>
                            {hiddenCommentsCount > 0 && (
                                <div className="text-center">
                                    <Button variant="outline" className="w-full bg-muted/50" onClick={() => setShowAllComments(true)}>
                                        <ChevronsUpDown className="h-4 w-4 mr-2" />
                                        Show {hiddenCommentsCount} previous event{hiddenCommentsCount > 1 ? 's' : ''}
                                    </Button>
                                </div>
                            )}
                            {visibleComments.map(comment => (
                                <Comment 
                                    key={comment.id}
                                    comment={comment}
                                    currentUser={currentUser}
                                    onSetReplyingTo={onSetReplyingTo}
                                    isReplying={replyingTo?.id === comment.id}
                                    canComment={!!canCommentAndInteract}
                                />
                            ))}
                        </>
                    ) : (
                        <div className="flex flex-col justify-center items-center h-24 rounded-lg border-2 border-dashed bg-muted/50">
                        <p className="text-muted-foreground font-medium">No activity yet.</p>
                        <p className="text-sm text-muted-foreground">Be the first to comment!</p>
                        </div>
                    )}
                  </div>
              </div>
              <Separator />
              {canCommentAndInteract && (
                    <TicketCommentForm
                        ticketId={ticket.id}
                        mentionableUsers={mentionableUsers}
                        currentUser={currentUser}
                        replyingTo={replyingTo}
                        onCancelReply={() => onSetReplyingTo(null)}
                        onCommentPosted={onCommentPosted}
                    />
                )}
            </>
          )}
      </div>
  );

  const Sidebar = () => (
     <div className="lg:col-span-1 grid gap-6">
         <Card>
              <CardHeader className='pb-4'>
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> People</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Requester</span>
                      <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                              <AvatarImage src={ticket.created_by_profile?.avatar_url ?? undefined} />
                              <AvatarFallback>{getInitials(ticket.created_by_profile?.full_name, ticket.created_by_profile?.username)}</AvatarFallback>
                          </Avatar>
                          <span>{ticket.created_by_profile?.full_name ?? 'Unknown User'}</span>
                      </div>
                  </div>
                  <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Assignee</span>
                       <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                              <AvatarImage src={getAssigneeAvatar(ticket) ?? undefined} />
                              <AvatarFallback>{getAssigneeInitials(ticket)}</AvatarFallback>
                          </Avatar>
                          <span>{getAssigneeName(ticket)}</span>
                      </div>
                  </div>
                   
                   <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 pt-1 text-muted-foreground">
                            <span>Collaborators</span>
                            {hasPermission('assign_tickets') && (
                                <CollaboratorManager
                                    ticket={ticket}
                                    allUsers={allUsers}
                                    onCollaboratorsChange={onCollaboratorsChange}
                                />
                            )}
                        </div>
                       <div className="flex items-center -space-x-2">
                          {ticket.collaborators && ticket.collaborators.length > 0 ? (
                              ticket.collaborators.map(c => (
                                  <TooltipProvider key={c.user_id}>
                                      <Tooltip>
                                          <TooltipTrigger asChild>
                                               <Avatar className="h-8 w-8 border-2 border-background">
                                                  <AvatarImage src={c.profiles?.avatar_url ?? undefined} />
                                                  <AvatarFallback>{getInitials(c.profiles?.full_name, c.profiles?.username)}</AvatarFallback>
                                              </Avatar>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                              <p>{c.profiles?.full_name ?? 'Unknown User'}</p>
                                          </TooltipContent>
                                      </Tooltip>
                                  </TooltipProvider>
                              ))
                          ) : <span className="text-xs text-muted-foreground">None</span> }
                      </div>
                  </div>
              </CardContent>
         </Card>
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5"/> Other Details</CardTitle>
              </CardHeader>
               <CardContent className="grid gap-4 text-sm">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Building className="h-4 w-4"/>
                            <span className="font-medium">Department(s)</span>
                        </div>
                       <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                            {ticket.departments.map(d => <Badge key={d.name} variant="outline">{d.name}</Badge>)}
                       </div>
                    </div>
                    {ticket.tags && ticket.tags.length > 0 && (
                    <>
                        <Separator/>
                        <div className="flex flex-col gap-2 pt-4">
                            <span className="text-muted-foreground font-medium flex items-center gap-2"><Tag className="h-4 w-4"/> Tags</span>
                            <div className="flex flex-wrap gap-2">
                                {ticket.tags.map(tag => (
                                    <Badge key={tag} variant="secondary">{tag}</Badge>
                                ))}
                            </div>
                        </div>
                    </>
                    )}
                    <Separator/>
                    <div>
                        {isTicketOnBoard ? (
                             <Button variant="outline" disabled className="w-full">
                                <ClipboardCheck className="mr-2 h-4 w-4 text-green-500" />
                                On the Task Board
                            </Button>
                        ) : (
                            <Button onClick={handleAddToBoard} disabled={isAddingToBoard} className="w-full">
                                {isAddingToBoard ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                ) : (
                                    <ClipboardCheck className="mr-2 h-4 w-4" />
                                )}
                                Add to Task Board
                            </Button>
                        )}
                    </div>
               </CardContent>
          </Card>
      </div>
  );

  return showActivityFeed ? (
    <>
      <MainContent />
      <Sidebar />
    </>
  ) : (
    <>
      <div className="lg:col-span-2">
        {/* Placeholder for when activity feed is hidden */}
      </div>
      <Sidebar />
    </>
  );
}
