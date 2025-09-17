
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase/server-pages';
import { askKnowledgeBase } from '@/ai/flows/knowledge-base-flow';
import { Readable } from 'stream';

export const config = {
    runtime: 'nodejs', // Important: Ensures Node.js runtime environment
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        await handlePost(req, res);
    } else if (req.method === 'GET') {
        await handleGet(req, res);
    } else if (req.method === 'PUT') {
        await handlePut(req, res);
    } else {
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { query, chatId: existingChatId, clientId } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        if (!clientId) {
            return res.status(400).json({ error: 'Client ID is required' });
        }
        
        const supabase = createClient({ req, res });

        let chatId = existingChatId;

        if (chatId) {
            const { data: existingChat, error: chatCheckError } = await supabase
                .from('chats')
                .select('id')
                .eq('id', chatId)
                .single();
            
            if (chatCheckError || !existingChat) {
                chatId = null;
            }
        }
        
        if (!chatId) {
            const { data: newChat, error: newChatError } = await supabase
                .from('chats')
                .insert({ client_id: clientId, status: 'active' })
                .select('id')
                .single();
            
            if (newChatError) throw newChatError;
            if (!newChat) {
                throw new Error("Failed to create a new chat session.");
            }
            chatId = newChat.id;
        }

        await supabase.from('chat_messages').insert({
            chat_id: chatId,
            sender_type: 'client',
            content: query,
        });

        // Add robust error handling around the AI call
        let aiResponseStream: ReadableStream<string>;
        try {
            aiResponseStream = await askKnowledgeBase(supabase, { query });
            if (!aiResponseStream) {
              throw new Error("AI service returned an empty response.");
            }
        } catch (aiError: any) {
            console.error('API_CHAT (POST): Error calling askKnowledgeBase:', aiError);
            return res.status(500).json({ error: `AI service failed: ${aiError.message}` });
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        const header = `{"chatId":"${chatId}"}\n\n`;
        res.write(header);

        for await (const chunk of aiResponseStream) {
            res.write(chunk);
        }

        res.end();

    } catch (error: any) {
        console.error('API_CHAT (POST): Unhandled error in POST handler:', error);
        return res.status(500).json({ error: `An unexpected error occurred: ${error.message}` });
    }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    const { chatId } = req.query;
    const supabase = createClient({ req, res });

    if (!chatId || typeof chatId !== 'string') {
        return res.status(400).json({ error: 'Chat ID is required' });
    }
    
    try {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error(`Error fetching chat history for ${chatId}:`, error);
            return res.status(500).json({ error: error.message });
        }
        
        const history = (data || []).map(msg => ({
            id: msg.id,
            sender: msg.sender_type,
            content: msg.content
        }));

        return res.status(200).json(history);

    } catch (error: any) {
        console.error('Error in chat history API (GET):', error);
        return res.status(500).json({ error: `An unexpected error occurred: ${error.message}` });
    }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
    try {
        const supabase = createClient({ req, res });
        const { chatId } = req.body;

        if (!chatId) {
            return res.status(400).json({ error: 'Chat ID is required' });
        }
        
        const { error } = await supabase
            .from('chats')
            .update({ status: 'resolved' })
            .eq('id', chatId);

        if (error) {
            console.error('Error closing chat:', error);
            return res.status(500).json({ error: `Database error: ${error.message}` });
        }

        return res.status(200).json({ success: true, message: 'Chat closed.' });

    } catch (error: any) {
        console.error('Error in chat closing API (PUT):', error);
        return res.status(500).json({ error: `An unexpected error occurred: ${error.message}` });
    }
}
