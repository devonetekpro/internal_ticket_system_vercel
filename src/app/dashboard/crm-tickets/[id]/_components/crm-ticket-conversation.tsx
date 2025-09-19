
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, User, Briefcase, Paperclip, UploadCloud, X, Download, Reply, FileText, Edit, Trash2, RefreshCcw, Lock, CheckCheck } from 'lucide-react';
import { addCrmTicketComment, updateCrmComment, deleteCrmComment, type UiComment, getCrmTicketById } from '@/services/crm-service';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import TextEditor from '@/components/text-editor';
import { stripHtml } from 'string-strip-html';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { TemplateSelectionModal } from '@/components/template-selection-modal';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import type { UiCrmTicketDetails } from '@/services/crm-service';
import { useTransition } from 'react';

const REFRESH_INTERVAL = 15000; // 15 seconds

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

export default function CrmTicketConversation({ initialTicket }: { initialTicket: UiCrmTicketDetails }) {
  const [ticket, setTicket] = useState(initialTicket);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isPrivateReply, setIsPrivateReply] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const handleRefresh = React.useCallback(async () => {
    const refreshedTicket = await getCrmTicketById(ticket.crm_id);
    if (refreshedTicket) {
      setTicket(refreshedTicket);
    }
  }, [ticket.crm_id]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      handleRefresh();
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [handleRefresh]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      if (selectedFile.size > 1 * 1024 * 1024) { // 1MB limit
        toast.error("File size cannot exceed 1MB.");
        return;
      }
      setAttachmentFile(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAttachmentPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setAttachmentPreview(null);
      }
    }
  };

  const removeFile = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    const fileInput = document.getElementById('reply-attachment-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };


  const handleReply = async () => {
    setIsReplying(true);
    const textContent = replyContent;

    let attachmentData: { name: string, file: string } | undefined = undefined;
    if (attachmentFile) {
        attachmentData = {
            name: attachmentFile.name,
            file: await fileToBase64(attachmentFile),
        };
    }
    
    try {
        const newComment = await addCrmTicketComment(ticket.crm_id, textContent, isPrivateReply, attachmentData);
        if (newComment) {
            handleRefresh(); // Refresh the whole conversation
            setReplyContent('');
            removeFile();
            setIsPrivateReply(false);
            toast.success('Reply sent successfully!');
        } else {
             toast.error('Failed to send reply.');
        }
    } catch (error) {
        console.error(error);
        toast.error('Failed to send reply.');
    } finally {
        setIsReplying(false);
    }
  }

  const handleEditComment = (commentId: number, text: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(text);
  };
  
  const handleCancelEdit = () => {
      setEditingCommentId(null);
      setEditingCommentText('');
  }

  const handleUpdateComment = async () => {
      if (!editingCommentId) return;
      setIsUpdatingComment(true);
      try {
          const result = await updateCrmComment(ticket.crm_id, editingCommentId.toString(), editingCommentText);
          if (result) {
              handleRefresh();
              toast.success("Comment updated successfully!");
              handleCancelEdit();
          } else {
              toast.error("Failed to update comment.");
          }
      } catch (error) {
          console.error(error);
          toast.error("An unexpected error occurred while updating the comment.");
      } finally {
          setIsUpdatingComment(false);
      }
  };

  const handleDeleteComment = async (commentId: number) => {
    const result = await deleteCrmComment(ticket.crm_id, commentId.toString());
    if (result.success) {
      toast.success(result.message);
      handleRefresh();
    } else {
      toast.error(result.message);
    }
  }

  const handleTemplateSelect = (content: string) => {
    setReplyContent(prev => prev + content);
    setIsTemplateModalOpen(false);
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Conversation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {ticket.comments.map(comment => (
          <div key={comment.id} className="flex items-start gap-4 group">
            <Avatar>
              <AvatarFallback>
                {comment.author === 'Client' ? <User className="h-5 w-5"/> : <Briefcase className="h-5 w-5"/>}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 rounded-lg w-[90%] break-words border p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold">{comment.authorName}</p>
                <div className="flex items-center gap-2">
                    {comment.isPrivate && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Lock className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>This is a private comment, not visible to the client.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    {comment.author === 'Manager' && (
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <CheckCheck className={`h-4 w-4 ${comment.isViewedByClient ? 'text-blue-500' : 'text-muted-foreground'}`} />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{comment.isViewedByClient ? 'Seen by client' : 'Not yet seen by client'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                  {comment.author === 'Manager' && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditComment(comment.id, comment.text)}><Edit className="h-3 w-3" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone. The comment will be permanently deleted.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteComment(comment.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </div>
              <Separator className="mb-4" />
              {editingCommentId === comment.id ? (
                <div className="space-y-2">
                  <Textarea value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} className="min-h-[80px]" />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                    <Button size="sm" onClick={handleUpdateComment} disabled={isUpdatingComment}>
                      {isUpdatingComment && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none text-sm space-y-4">
                  <div dangerouslySetInnerHTML={{ __html: comment.text.replace(/\n/g, '<br />') }}></div>
                  {comment.attachments && comment.attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {comment.attachments.map((att, index) => {
                        if (!att || typeof att.file !== 'string' || att.file === '') return null;
                        const isImage = att.file.startsWith('data:image/');
                        return (
                          <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                            {isImage ? (
                              <Image src={att.file} alt={att.name} width={80} height={60} className="object-cover rounded-md" />
                            ) : (
                              <div className="w-[80px] h-[60px] bg-muted flex items-center justify-center rounded-md">
                                <Paperclip className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium truncate" title={att.name}>{att.name}</p>
                              <a href={att.file} download={att.name} className="text-xs text-primary hover:underline">Download</a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {ticket.comments.length === 0 && <div className="text-center text-muted-foreground py-8">No comments on this ticket yet.</div>}
      </CardContent>
      <CardFooter className="flex-col items-start gap-4 border-t pt-6">
        <div className="w-full flex justify-between items-center">
          <h3 className="font-semibold">Add Reply</h3>
          <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
            <DialogTrigger asChild><Button variant="outline" type="button"><FileText className="mr-2 h-4 w-4" /> Use Template</Button></DialogTrigger>
            <TemplateSelectionModal onTemplateSelect={handleTemplateSelect} />
          </Dialog>
        </div>
        <div className="w-full space-y-4">
          <TextEditor value={replyContent} onChange={setReplyContent} placeholder="Type your reply to the client here..." />
          <div className="flex items-center justify-center w-full">
            <label htmlFor="reply-attachment-input" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-muted-foreground">PDF, DOC, PNG, JPG, etc. (MAX. 1MB)</p>
              </div>
              <Input id="reply-attachment-input" type="file" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
          {attachmentPreview && (
            <div className="mt-2 relative w-24 h-24">
              <Image src={attachmentPreview} alt="File preview" width={96} height={96} className="w-full h-full object-cover rounded-md border" />
              <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={removeFile}><X className="h-4 w-4" /></Button>
            </div>
          )}
          {attachmentFile && !attachmentPreview && (
            <div className="mt-2 flex items-center p-2 bg-muted rounded-md text-sm border">
              <Paperclip className="h-4 w-4 mr-2" />
              <span className="flex-grow truncate">{attachmentFile.name} - {(attachmentFile.size / 1024 / 1024).toFixed(2)}MB</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full ml-2" onClick={removeFile}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
          )}
          <div className="flex items-center gap-4">
            <Button onClick={handleReply} disabled={!stripHtml(replyContent).result.trim() || isReplying}>
              {isReplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reply
            </Button>
            <div className="flex items-center space-x-2">
              <Checkbox id="private-reply" checked={isPrivateReply} onCheckedChange={(checked) => setIsPrivateReply(!!checked)} />
              <label htmlFor="private-reply" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                Private Message
              </label>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
