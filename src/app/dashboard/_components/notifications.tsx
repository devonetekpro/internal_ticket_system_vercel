
'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Bell, CheckCheck, UserPlus, FileSignature, AtSign, MessageCircleWarning, MessageCircleHeart, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Notification, Profile } from '@/lib/database.types'
import { markNotificationAsRead, markAllNotificationsAsRead } from '../_actions/notification-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { stripHtml } from 'string-strip-html'
import { getCrmTickets } from '@/services/crm-service'
import { usePermissions } from '@/components/providers/permissions-provider'

type NotificationWithProfile = Notification & {
    profiles: Pick<Profile, 'full_name' | 'username' | 'avatar_url'> | null
}

const iconMap: { [key: string]: React.ElementType } = {
    assignment: UserPlus,
    collaboration: UserPlus,
    mention: AtSign,
    status_change: FileSignature,
    crm_waiting: MessageCircleWarning,
    live_chat: MessageCircleHeart,
}

const iconColorMap: { [key: string]: string } = {
    assignment: 'bg-blue-500',
    collaboration: 'bg-green-500',
    mention: 'bg-purple-500',
    status_change: 'bg-teal-500',
    crm_waiting: 'bg-amber-500',
    live_chat: 'bg-pink-500',
}

const CRM_POLL_INTERVAL = 10 * 60 * 1000; // 10 minutes

export default function Notifications() {
    const router = useRouter()
    const supabase = createClient()
    const [notifications, setNotifications] = useState<NotificationWithProfile[]>([]);
    const [loading, startTransition] = useTransition();
    const { permissions, isLoading: permissionsLoading, hasPermission } = usePermissions();
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Fetch initial notifications
    useEffect(() => {
        const fetchInitialNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            startTransition(async () => {
                const { data } = await supabase
                  .from("notifications")
                  .select(
                    "*, profiles!notifications_actor_id_fkey(full_name, username, avatar_url)"
                  )
                  .eq("user_id", user.id)
                  .order("created_at", { ascending: false })
                  .limit(20);
                
                setNotifications(data as any[] ?? []);
                setIsInitialLoad(false);
            });
        };
        fetchInitialNotifications();
    }, [supabase]);


    // Request permission for browser notifications when the component mounts
    useEffect(() => {
      if (typeof window !== 'undefined' && "Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
          Notification.requestPermission().then(permission => {
            if (permission === "granted") {
              console.log("Notification permission granted.");
            }
          });
        }
      }
    }, []);

    // Effect for polling new CRM tickets
    useEffect(() => {
        if (permissionsLoading) return;

        const userDepartment = permissions['department'] as string;
        const userRole = permissions['role'] as string;

        const isBackOffice = userDepartment === 'BackOffice';
        const isDeptHeadOfBackOffice = userRole === 'department_head' && isBackOffice;

        const canSeeCrmNotifs = isBackOffice || isDeptHeadOfBackOffice || hasPermission('manage_all_users');
        
        if (!canSeeCrmNotifs) {
            return;
        }

        const checkForNewCrmTickets = async () => {
            try {
                const { counts } = await getCrmTickets({ view: 'all', pageSize: 1 });
                const newWaitingCount = counts.waiting_for_response;
                const lastWaitingCount = parseInt(localStorage.getItem('lastCrmWaitingCount') || '0', 10);
                
                if (newWaitingCount > 0 && newWaitingCount > lastWaitingCount) {
                    const message = `You have ${newWaitingCount} CRM ticket${newWaitingCount > 1 ? 's' : ''} waiting for a response.`;
                    if (Notification.permission === "granted") {
                        const notification = new Notification("HelpFlow: CRM Desk", {
                            body: message,
                            icon: '/favicon.ico'
                        });
                        notification.onclick = () => {
                            window.focus();
                            router.push(`/dashboard/crm-tickets?view=waiting_for_response`);
                        }
                    }
                    const crmNotification: NotificationWithProfile = {
                        id: `crm-waiting-${Date.now()}`,
                        created_at: new Date().toISOString(),
                        is_read: false,
                        message: `<b>${newWaitingCount} CRM ticket${newWaitingCount > 1 ? 's' : ''}</b> are waiting for a response.`,
                        notification_type: 'crm_waiting',
                        ticket_id: null,
                        user_id: '',
                        actor_id: null,
                        profiles: { full_name: 'CRM System', username: 'crm', avatar_url: null }
                    };
                    setNotifications(prev => [crmNotification, ...prev.filter(n => n.notification_type !== 'crm_waiting')]);
                }
                
                localStorage.setItem('lastCrmWaitingCount', newWaitingCount.toString());
            } catch (error) {
                console.error("Failed to check for new CRM tickets:", error);
            }
        };

        checkForNewCrmTickets();
        const intervalId = setInterval(checkForNewCrmTickets, CRM_POLL_INTERVAL);
        return () => clearInterval(intervalId);
    }, [router, permissions, permissionsLoading, hasPermission]);

    // Realtime subscription for new notifications
    useEffect(() => {
        const fetchUserAndSubscribe = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const channel = supabase.channel(`realtime-notifications:${user.id}`)
                .on('postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`
                    },
                    async (payload) => {
                        const newNotification = payload.new as NotificationWithProfile;
                        
                        let actorProfile = null;
                        if (newNotification.actor_id) {
                             const { data: profileData } = await supabase
                                .from('profiles')
                                .select('full_name, username, avatar_url')
                                .eq('id', newNotification.actor_id)
                                .single();
                            actorProfile = profileData;
                        }
                        
                        if (Notification.permission === "granted") {
                            const cleanMessage = stripHtml(newNotification.message).result;
                            const notification = new Notification("HelpFlow: Internal Desk", {
                                body: cleanMessage,
                                icon: '/favicon.ico'
                            });
                            notification.onclick = () => {
                                window.focus();
                                if(newNotification.ticket_id) router.push(`/dashboard/tickets/${newNotification.ticket_id}`);
                            }
                        }
                        setNotifications(prev => [{...newNotification, profiles: actorProfile}, ...prev]);
                    }
                ).subscribe();

            return () => {
                supabase.removeChannel(channel);
            }
        };

        const subscription = fetchUserAndSubscribe();
        return () => {
            subscription.then(cleanup => cleanup && cleanup());
        }
    }, [supabase, router]);
    
    const handleNotificationClick = async (notification: Notification) => {
        if (notification.notification_type === 'crm_waiting') {
            router.push('/dashboard/crm-tickets?view=waiting_for_response');
            setNotifications(notifications.filter(n => n.id !== notification.id));
            return;
        }

        if (notification.notification_type === 'live_chat') {
            router.push('/dashboard/live-chat');
            setNotifications(notifications.filter(n => n.id !== notification.id));
            return;
        }

        if (!notification.is_read) {
            await markNotificationAsRead(notification.id)
            setNotifications(notifications.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
        }

        if (notification.ticket_id) {
            router.push(`/dashboard/tickets/${notification.ticket_id}`)
        }
    }

    const handleMarkAllRead = async () => {
        const result = await markAllNotificationsAsRead()
        if(result.success) {
            toast.success('All notifications marked as read.')
            setNotifications(notifications.map(n => ({...n, is_read: true})));
        } else {
            toast.error(result.message)
        }
    }

    const unreadCount = notifications.filter(n => !n.is_read).length

    const NotificationIcon = ({ notification }: { notification: NotificationWithProfile }) => {
        const Icon = iconMap[notification.notification_type ?? ''] ?? Bell;
        const bgColor = iconColorMap[notification.notification_type ?? ''] ?? 'bg-gray-500';

        if (notification.notification_type === 'crm_waiting') {
             return (
                 <div className="relative">
                    <Avatar className="h-10 w-10 bg-muted">
                        <AvatarFallback><MessageCircleWarning className="text-amber-500" /></AvatarFallback>
                    </Avatar>
                </div>
            )
        }
        
        if (notification.notification_type === 'live_chat') {
             return (
                 <div className="relative">
                    <Avatar className="h-10 w-10 bg-muted">
                        <AvatarFallback><MessageCircleHeart className="text-pink-500" /></AvatarFallback>
                    </Avatar>
                </div>
            )
        }

        return (
             <div className="relative">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={notification.profiles?.avatar_url ?? ''} />
                    <AvatarFallback>{getInitials(notification.profiles?.full_name, notification.profiles?.username)}</AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 rounded-full p-1 border-2 border-popover ${bgColor}`}>
                    <Icon className="h-3 w-3 text-white" />
                </div>
            </div>
        )
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
                 <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="end">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h4 className="font-medium leading-none">Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                        You have {unreadCount} unread messages.
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs">
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Mark all as read
                    </Button>
                )}
            </div>
            <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                {isInitialLoad ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : notifications.length > 0 ? (
                    notifications.map(n => (
                        <button 
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`flex items-start text-left gap-3 p-2 rounded-md hover:bg-muted ${!n.is_read ? '' : 'opacity-60'}`}
                        >
                            <NotificationIcon notification={n}/>
                            <div className="flex-1 space-y-1">
                                 <p className="text-sm leading-snug" dangerouslySetInnerHTML={{ __html: n.message }}></p>
                                <p className={`text-xs text-muted-foreground ${!n.is_read ? 'font-semibold' : ''}`}>
                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                </p>
                            </div>
                        </button>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No notifications.</p>
                )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
}
