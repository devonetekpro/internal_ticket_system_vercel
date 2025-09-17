'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Book, FileText, Search, UploadCloud, Loader2, Trash2 } from 'lucide-react';
import React, { useState, useMemo, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { getDocuments, uploadDocument, deleteDocument } from './_actions/document-actions';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import type { Database } from '@/lib/database.types';
import { usePermissions } from '@/components/providers/permissions-provider';

type KnowledgeBaseDocument = Database['public']['Tables']['knowledge_base_documents']['Row'];

export default function KnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('manage_knowledge_base');

  React.useEffect(() => {
    const fetchDocuments = async () => {
      setIsFetching(true);
      const docs = await getDocuments();
      setDocuments(docs);
      setIsFetching(false);
    };
    fetchDocuments();
  }, []);

  const resetFileInput = () => {
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleUpload = (file: File) => {
    const formData = new FormData();
    formData.append('document', file);

    setIsUploading(true);
    startTransition(async () => {
      const result = await uploadDocument(formData);
      if (result.success && result.document) {
        toast.success(result.message);
        setDocuments(prev => [result.document!, ...prev]);
      } else {
        toast.error(result.message);
      }
      resetFileInput();
      setIsUploading(false);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
        const result = await deleteDocument(id);
        if (result.success) {
            toast.success(result.message);
            setDocuments(prev => prev.filter(doc => doc.id !== id));
            resetFileInput();
        } else {
            toast.error(result.message);
        }
    });
  };

  const filteredDocuments = useMemo(() => {
    if (!searchTerm) {
      return documents;
    }
    return documents.filter(doc =>
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, documents]);

  return (
    <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 gap-6 md:gap-8 bg-background text-foreground">
        <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
                  <Book className="h-8 w-8 text-primary" /> Knowledge Base
              </h1>
              <p className="text-muted-foreground">
                  Manage documents for the AI Assistant and view articles.
              </p>
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                 {canManage && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Upload New Document</CardTitle>
                            <CardDescription>Upload TXT or PDF files to the knowledge base.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form action={() => fileInputRef.current?.click()}>
                                <div className="flex items-center justify-center w-full">
                                    <label htmlFor="document-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-muted-foreground">TXT, PDF (MAX. 5MB)</p>
                                        </div>
                                        <Input id="document-upload" type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept=".txt,.pdf" disabled={isPending} />
                                    </label>
                                </div>
                                {isUploading && (
                                    <div className="mt-4 flex items-center text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Uploading and processing document...
                                    </div>
                                )}
                            </form>
                        </CardContent>
                    </Card>
                 )}
            </div>
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Uploaded Documents</CardTitle>
                        <div className="relative mt-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Search documents..."
                                className="pl-10 py-3"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                            {isFetching ? (
                                <div className="space-y-4">
                                    {[...Array(3)].map((_, i) => <div key={i} className="h-16 w-full bg-muted animate-pulse rounded-md" />)}
                                </div>
                            ) : filteredDocuments.length > 0 ? (
                                <div className="space-y-2">
                                    {filteredDocuments.map((doc) => (
                                        <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-5 w-5 text-primary" />
                                                <div>
                                                    <p className="font-medium">{doc.file_name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Uploaded on {format(new Date(doc.created_at), 'PPP')}
                                                    </p>
                                                </div>
                                            </div>
                                            {canManage && (
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} disabled={isPending}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-16">
                                    <p className="text-lg font-medium">No documents found</p>
                                    <p>Upload a document to get started.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    </main>
  );
}
