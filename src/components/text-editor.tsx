
'use client'

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Smile,
} from 'lucide-react'
import { Toggle } from './ui/toggle'
import { Separator } from './ui/separator'
import { suggestion } from './mention-list'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import EmojiPicker, { EmojiStyle } from 'emoji-picker-react';
import Emoji from '@tiptap/extension-emoji';


type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mentionableUsers?: Profile[];
}

const TextEditor = ({ value, onChange, placeholder, mentionableUsers = [] }: TextEditorProps) => {

  const mentionExtension = useMemo(() => Mention.configure({
      HTMLAttributes: {
        class: 'mention',
      },
      suggestion: suggestion(mentionableUsers),
  }), [mentionableUsers]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      mentionExtension,
      Emoji.configure({
        emojis: [],
        enableEmoticons: true,
      })
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-lg m-5 focus:outline-none',
      },
    },
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
        editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) {
    return null
  }

  return (
    <div className="flex flex-col rounded-md border">
      <div className="flex items-center gap-1 border-b border-input p-2 flex-wrap">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>
        <Separator orientation="vertical" className="h-8 w-[1px]" />
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        <Popover>
          <PopoverTrigger asChild>
            <Toggle size="sm">
              <Smile className="h-4 w-4" />
            </Toggle>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-0">
             <EmojiPicker
                onEmojiClick={(emojiObject) => {
                  editor.chain().focus().insertContent(emojiObject.emoji).run()
                }}
                emojiStyle={EmojiStyle.NATIVE}
              />
          </PopoverContent>
        </Popover>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

export default TextEditor;
