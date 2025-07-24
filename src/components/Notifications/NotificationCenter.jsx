import React,{useState,useEffect} from 'react';
import {motion,AnimatePresence} from 'framer-motion';
import {useAuth} from '../../contexts/AuthContext';
import {supabase} from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const {FiBell,FiX,FiCheck,FiMessageCircle,FiAtSign,FiUser}=FiIcons;

const NotificationCenter=()=> {
  const {user}=useAuth();
  const [notifications,setNotifications]=useState([]);
  const [showNotifications,setShowNotifications]=useState(false);
  const [loading,setLoading]=useState(false);

  // Load notifications from Supabase
  const loadNotifications=async ()=> {
    try {
      console.log('📡 Loading notifications for user:',user.id);
      
      const {data: supabaseNotifications,error}=await supabase
        .from('notifications_sommerhus_2024')
        .select('*')
        .eq('user_id',user.id)
        .order('created_at',{ascending: false})
        .limit(50);

      if (error) {
        console.error('❌ Supabase notification load error:',error);
        // Fallback to localStorage
        const localNotifications=JSON.parse(localStorage.getItem('sommerhus_notifications') || '[]');
        const userNotifications=localNotifications.filter(n=> n.userId===user.id);
        setNotifications(userNotifications);
        return;
      }

      if (supabaseNotifications) {
        console.log('✅ Loaded notifications from Supabase:',supabaseNotifications.length);
        
        const convertedNotifications=supabaseNotifications.map(notif=> ({
          id: notif.id,
          userId: notif.user_id,
          type: notif.type,
          message: notif.message,
          relatedMessageId: notif.related_message_id,
          relatedReplyId: notif.related_reply_id,
          fromUserName: notif.from_user_name,
          fromUserId: notif.from_user_id,
          read: notif.read,
          timestamp: notif.created_at
        }));

        setNotifications(convertedNotifications);
        // Also sync to localStorage for offline access
        localStorage.setItem('sommerhus_notifications',JSON.stringify(convertedNotifications));
      }
    } catch (error) {
      console.error('❌ Load notifications error:',error);
      // Fallback to localStorage
      const localNotifications=JSON.parse(localStorage.getItem('sommerhus_notifications') || '[]');
      const userNotifications=localNotifications.filter(n=> n.userId===user.id);
      setNotifications(userNotifications);
    }
  };

  // Setup real-time notifications
  useEffect(()=> {
    if (!user?.id) return;

    console.log('🚀 Setting up notifications for user:',user.id);
    
    // Initial load
    loadNotifications();

    // Real-time subscription for new notifications
    const channel=supabase
      .channel('notifications-live')
      .on('postgres_changes',{
        event: 'INSERT',
        schema: 'public',
        table: 'notifications_sommerhus_2024',
        filter: `user_id=eq.${user.id}`
      },(payload)=> {
        console.log('📡 New notification received:',payload);
        loadNotifications();
        
        // Show toast for new notification
        if (payload.new) {
          toast.success(`🔔 ${payload.new.message}`,{
            duration: 4000,
            icon: payload.new.type==='mention' ? '📢' : '💬'
          });
        }
      })
      .subscribe((status)=> {
        console.log('📡 Notification subscription status:',status);
      });

    // Periodic sync every 30 seconds
    const syncInterval=setInterval(loadNotifications,30000);

    return ()=> {
      console.log('🔌 Cleaning up notification subscriptions');
      channel.unsubscribe();
      clearInterval(syncInterval);
    };
  },[user?.id]);

  // Mark notification as read
  const markAsRead=async (notificationId)=> {
    setLoading(true);
    try {
      console.log('✅ Marking notification as read:',notificationId);
      
      // Update in Supabase
      const {error}=await supabase
        .from('notifications_sommerhus_2024')
        .update({read: true})
        .eq('id',notificationId);

      if (!error) {
        // Update local state
        setNotifications(prev=> prev.map(n=> 
          n.id===notificationId ? {...n,read: true} : n
        ));
        
        // Update localStorage
        const allNotifications=JSON.parse(localStorage.getItem('sommerhus_notifications') || '[]');
        const updatedNotifications=allNotifications.map(n=> 
          n.id===notificationId ? {...n,read: true} : n
        );
        localStorage.setItem('sommerhus_notifications',JSON.stringify(updatedNotifications));
      } else {
        console.error('❌ Mark as read error:',error);
      }
    } catch (error) {
      console.error('❌ Mark as read error:',error);
    } finally {
      setLoading(false);
    }
  };

  // Mark all notifications as read
  const markAllAsRead=async ()=> {
    setLoading(true);
    try {
      const unreadIds=notifications.filter(n=> !n.read).map(n=> n.id);
      
      if (unreadIds.length > 0) {
        console.log('✅ Marking all notifications as read:',unreadIds.length);
        
        // Update in Supabase
        const {error}=await supabase
          .from('notifications_sommerhus_2024')
          .update({read: true})
          .in('id',unreadIds);

        if (!error) {
          // Update local state
          setNotifications(prev=> prev.map(n=> ({...n,read: true})));
          
          // Update localStorage
          const allNotifications=JSON.parse(localStorage.getItem('sommerhus_notifications') || '[]');
          const updatedNotifications=allNotifications.map(n=> 
            unreadIds.includes(n.id) ? {...n,read: true} : n
          );
          localStorage.setItem('sommerhus_notifications',JSON.stringify(updatedNotifications));
          
          toast.success('Alle notifikationer markeret som læst');
        } else {
          console.error('❌ Mark all as read error:',error);
          toast.error('Fejl ved opdatering af notifikationer');
        }
      }
    } catch (error) {
      console.error('❌ Mark all as read error:',error);
      toast.error('Fejl ved opdatering af notifikationer');
    } finally {
      setLoading(false);
    }
  };

  // Delete notification
  const deleteNotification=async (notificationId)=> {
    setLoading(true);
    try {
      console.log('🗑️ Deleting notification:',notificationId);
      
      // Delete from Supabase
      const {error}=await supabase
        .from('notifications_sommerhus_2024')
        .delete()
        .eq('id',notificationId);

      if (!error) {
        // Update local state
        setNotifications(prev=> prev.filter(n=> n.id !== notificationId));
        
        // Update localStorage
        const allNotifications=JSON.parse(localStorage.getItem('sommerhus_notifications') || '[]');
        const updatedNotifications=allNotifications.filter(n=> n.id !== notificationId);
        localStorage.setItem('sommerhus_notifications',JSON.stringify(updatedNotifications));
      } else {
        console.error('❌ Delete notification error:',error);
      }
    } catch (error) {
      console.error('❌ Delete notification error:',error);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to related message/reply
  const handleNotificationClick=(notification)=> {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Close the notification panel
    setShowNotifications(false);
    
    // You could emit an event to navigate to the message
    window.dispatchEvent(new CustomEvent('navigateToMessage',{
      detail: {
        messageId: notification.relatedMessageId,
        replyId: notification.relatedReplyId
      }
    }));
  };

  const formatTime=(dateString)=> {
    const date=new Date(dateString);
    const now=new Date();
    const diff=now - date;
    
    if (diff < 60000) return 'Nu';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} t`;
    return date.toLocaleDateString('da-DK');
  };

  const getNotificationIcon=(type)=> {
    switch (type) {
      case 'mention': return FiAtSign;
      case 'reply': return FiMessageCircle;
      default: return FiBell;
    }
  };

  const getNotificationColor=(type)=> {
    switch (type) {
      case 'mention': return 'text-yellow-600';
      case 'reply': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const unreadCount=notifications.filter(n=> !n.read).length;

  return (
    <div className="relative">
      <button 
        onClick={()=> setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-ebeltoft-blue transition-colors"
        disabled={loading}
      >
        <SafeIcon icon={FiBell} className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{opacity: 0,y: -10,scale: 0.95}}
            animate={{opacity: 1,y: 0,scale: 1}}
            exit={{opacity: 0,y: -10,scale: 0.95}}
            className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Notifikationer</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      disabled={loading}
                      className="text-xs text-ebeltoft-blue hover:text-ebeltoft-dark disabled:opacity-50"
                    >
                      Marker alle som læst
                    </button>
                  )}
                  <button 
                    onClick={()=> setShowNotifications(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <SafeIcon icon={FiX} className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {unreadCount} ulæst{unreadCount !== 1 ? 'e' : ''}
                </p>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto">
              {notifications.length===0 ? (
                <div className="p-4 text-center text-gray-500">
                  <SafeIcon icon={FiBell} className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Ingen notifikationer</p>
                </div>
              ) : (
                notifications.map((notification)=> {
                  const IconComponent=getNotificationIcon(notification.type);
                  const iconColor=getNotificationColor(notification.type);

                  return (
                    <motion.div 
                      key={notification.id}
                      initial={{opacity: 0,x: -20}}
                      animate={{opacity: 1,x: 0}}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-400' : ''
                      }`}
                      onClick={()=> handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`mt-1 ${iconColor}`}>
                            <SafeIcon icon={IconComponent} className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm ${
                              !notification.read ? 'font-medium text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1">
                                <SafeIcon icon={FiUser} className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">{notification.fromUserName}</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatTime(notification.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-2">
                          {!notification.read && (
                            <button 
                              onClick={(e)=> {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              disabled={loading}
                              className="text-ebeltoft-blue hover:text-ebeltoft-dark disabled:opacity-50"
                            >
                              <SafeIcon icon={FiCheck} className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={(e)=> {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            disabled={loading}
                            className="text-gray-400 hover:text-red-500 disabled:opacity-50"
                          >
                            <SafeIcon icon={FiX} className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
                <p className="text-xs text-gray-500">
                  Viser de seneste {Math.min(notifications.length,50)} notifikationer
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;