
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'

import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getInitials } from '@/lib/utils';


type MentionUser = {
  id: string,
  label: string,
  avatar_url?: string | null,
  username?: string | null,
}

const MentionList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]

    if (item) {
      props.command({ id: item.username, label: item.label })
    }
  }

  const upHandler = () => {
    setSelectedIndex(((selectedIndex + props.items.length) - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: React.KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  return (
    <div className="items bg-card border rounded-lg shadow-xl overflow-hidden p-1">
      {props.items.length
        ? props.items.map((item: MentionUser, index: number) => (
          <button
            className={`item flex items-center gap-2 w-full text-left p-2 rounded-md ${index === selectedIndex ? 'is-selected bg-muted' : ''}`}
            key={index}
            onClick={() => selectItem(index)}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={item.avatar_url ?? undefined} />
              <AvatarFallback>{getInitials(item.label, item.username)}</AvatarFallback>
            </Avatar>
            <span>{item.label}</span>
          </button>
        ))
        : <div className="item p-2 text-sm text-muted-foreground">No results</div>
      }
    </div>
  )
});

MentionList.displayName = 'MentionList';


import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export const suggestion = (users: Profile[]) => ({
  items: ({ query }: { query: string }) => {
    return users.filter(item => 
        (item.full_name?.toLowerCase().startsWith(query.toLowerCase()) || 
         item.username?.toLowerCase().startsWith(query.toLowerCase()))
      )
      .slice(0, 5)
      .map(user => ({
        id: user.id,
        label: user.full_name ?? user.username,
        username: user.username,
        avatar_url: user.avatar_url,
      }))
  },

  render: () => {
    let component: any
    let popup: any

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate(props: any) {
        component.updateProps(props)

        if (!props.clientRect) {
          return
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      onKeyDown({ event }: { event: React.KeyboardEvent }) {
        if (event.key === 'Escape') {
          popup[0].hide()

          return true
        }

        return component.ref?.onKeyDown({ event })
      },

      onExit() {
        popup[0].destroy()
        component.destroy()
      },
    }
  },
})
