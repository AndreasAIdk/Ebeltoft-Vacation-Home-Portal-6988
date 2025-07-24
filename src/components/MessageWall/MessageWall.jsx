import React,{useState,useEffect} from 'react';
import {motion,AnimatePresence} from 'framer-motion';
import {useAuth} from '../../contexts/AuthContext';
import {supabase} from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const {FiSend,FiUser,FiClock,FiHeart,FiTrash2,FiRefreshCw,FiMessageCircle,FiCornerDownRight,FiAtSign,FiEdit3,FiSave,FiX}=FiIcons;

const PinIcon=({className='',...props})=> (
  <svg className={className} {...props} viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M12 2C13.1 2 14 2.9 14 4C14 4.74 13.6 5.39 13 5.73V7H16V9H15V16L12 18L9 16V9H8V7H11V5.73C10.4 5.39 10 4.74 10 4C10 2.9 10.9 2 12 2M11 10V15.5L12 16L13 15.5V10H11Z" />
  </svg>
);

const MessageWall=()=> {
  const {user}=useAuth();
  const [messages,setMessages]=useState([]);
  const [replies,setReplies]=useState({});
  const [newMessage,setNewMessage]=useState('');
  const [replyingTo,setReplyingTo]=useState(null);
  const [replyContent,setReplyContent]=useState('');
  const [editingReply,setEditingReply]=useState(null);
  const [editReplyContent,setEditReplyContent]=useState('');
  const [loading,setLoading]=useState(false);
  const [syncing,setSyncing]=useState(false);
  const [showReplies,setShowReplies]=useState({});
  const [allUsers,setAllUsers]=useState([]);
  const [mentionSuggestions,setMentionSuggestions]=useState([]);
  const [showMentions,setShowMentions]=useState(false);
  const [currentInput,setCurrentInput]=useState('message');

  const generateUUID=()=> {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c) {
      const r=Math.random() * 16 | 0;
      const v=c=='x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const loadFromSupabase=async (showToast=false)=> {
    if (showToast) setSyncing(true);
    try {
      const {data: supabaseMessages,error: messagesError}=await supabase
        .from('messages_sommerhus_2024')
        .select('*')
        .order('created_at',{ascending: false});

      const {data: supabaseReplies,error: repliesError}=await supabase
        .from('message_replies_sommerhus_2024')
        .select('*')
        .order('created_at',{ascending: true});

      if (!messagesError && supabaseMessages) {
        const convertedMessages=supabaseMessages.map(msg=> ({
          id: msg.id,
          author: msg.author_name,
          authorId: msg.author_id,
          content: msg.content,
          timestamp: msg.created_at,
          likes: msg.likes || [],
          isPinned: msg.is_pinned || false,
          mentionedUsers: msg.mentioned_users || []
        }));
        setMessages(convertedMessages);
        localStorage.setItem('sommerhus_messages_backup',JSON.stringify(convertedMessages));
        if (showToast) {
          toast.success(`${convertedMessages.length} beskeder hentet`);
        }
      } else {
        const backup=JSON.parse(localStorage.getItem('sommerhus_messages_backup') || '[]');
        setMessages(backup);
      }

      if (!repliesError && supabaseReplies) {
        const repliesGrouped={};
        supabaseReplies.forEach(reply=> {
          const messageId=reply.message_id;
          if (!repliesGrouped[messageId]) {
            repliesGrouped[messageId]=[];
          }
          repliesGrouped[messageId].push({
            id: reply.id,
            messageId: messageId,
            parentReplyId: reply.parent_reply_id,
            author: reply.author_name,
            authorId: reply.author_id,
            content: reply.content,
            timestamp: reply.created_at,
            likes: reply.likes || [],
            mentionedUsers: reply.mentioned_users || []
          });
        });
        setReplies(repliesGrouped);
        localStorage.setItem('sommerhus_replies_backup',JSON.stringify(repliesGrouped));
      } else {
        const backup=JSON.parse(localStorage.getItem('sommerhus_replies_backup') || '{}');
        setReplies(backup);
      }
    } catch (error) {
      console.error('Load error:',error);
      const messageBackup=JSON.parse(localStorage.getItem('sommerhus_messages_backup') || '[]');
      const replyBackup=JSON.parse(localStorage.getItem('sommerhus_replies_backup') || '{}');
      setMessages(messageBackup);
      setReplies(replyBackup);
      if (showToast) toast.error('Fejl ved forbindelse - bruger backup');
    } finally {
      if (showToast) setSyncing(false);
    }
  };

  const loadUsers=async ()=> {
    try {
      const {data: supabaseUsers,error}=await supabase
        .from('users_sommerhus_2024')
        .select('id,username,full_name');

      if (!error && supabaseUsers) {
        setAllUsers(supabaseUsers);
      } else {
        const localUsers=JSON.parse(localStorage.getItem('sommerhus_users') || '[]');
        setAllUsers(localUsers.map(u=> ({
          id: u.id,
          username: u.username,
          full_name: u.fullName
        })));
      }
    } catch (error) {
      console.error('Error loading users:',error);
    }
  };

  // 🔥 FIXED: Proper notification creation in Supabase
  const sendMentionNotifications=async (mentionedUserIds,messageId,replyId,fromUserName)=> {
    try {
      console.log('📢 Sending mention notifications to:',mentionedUserIds);
      
      const notifications=mentionedUserIds.map(userId=> ({
        id: generateUUID(),
        user_id: userId,
        type: 'mention',
        message: `${fromUserName} nævnte dig i en ${replyId ? 'svar' : 'besked'}`,
        related_message_id: messageId,
        related_reply_id: replyId,
        from_user_name: fromUserName,
        from_user_id: user.id,
        read: false,
        created_at: new Date().toISOString()
      }));

      const {error}=await supabase
        .from('notifications_sommerhus_2024')
        .insert(notifications);

      if (error) {
        console.error('❌ Notification insert error:',error);
      } else {
        console.log('✅ Mention notifications sent successfully');
      }
    } catch (error) {
      console.error('Send mention notifications error:',error);
    }
  };

  const sendReplyNotification=async (userId,messageId,replyId,fromUserName)=> {
    try {
      console.log('💬 Sending reply notification to:',userId);
      
      const notification={
        id: generateUUID(),
        user_id: userId,
        type: 'reply',
        message: `${fromUserName} svarede på din besked`,
        related_message_id: messageId,
        related_reply_id: replyId,
        from_user_name: fromUserName,
        from_user_id: user.id,
        read: false,
        created_at: new Date().toISOString()
      };

      const {error}=await supabase
        .from('notifications_sommerhus_2024')
        .insert([notification]);

      if (error) {
        console.error('❌ Reply notification error:',error);
      } else {
        console.log('✅ Reply notification sent successfully');
      }
    } catch (error) {
      console.error('Send reply notification error:',error);
    }
  };

  const saveMessageToSupabase=async (messageData)=> {
    setLoading(true);
    try {
      const finalMessage={
        id: generateUUID(),
        author_name: messageData.author,
        author_id: messageData.authorId,
        content: messageData.content,
        created_at: new Date().toISOString(),
        likes: messageData.likes || [],
        is_pinned: messageData.isPinned || false,
        mentioned_users: messageData.mentionedUsers || []
      };

      const tempMessage={
        id: finalMessage.id,
        author: finalMessage.author_name,
        authorId: finalMessage.author_id,
        content: finalMessage.content,
        timestamp: finalMessage.created_at,
        likes: finalMessage.likes,
        isPinned: finalMessage.is_pinned,
        mentionedUsers: finalMessage.mentioned_users
      };

      const updatedMessages=[tempMessage,...messages];
      setMessages(updatedMessages);
      localStorage.setItem('sommerhus_messages_backup',JSON.stringify(updatedMessages));

      const {error}=await supabase
        .from('messages_sommerhus_2024')
        .insert([finalMessage]);

      if (error) {
        console.error('Supabase save failed:',error);
        toast.error('Fejl ved gemning');
        return false;
      }

      toast.success('Besked gemt!');

      if (messageData.mentionedUsers && messageData.mentionedUsers.length > 0) {
        await sendMentionNotifications(messageData.mentionedUsers,finalMessage.id,null,messageData.author);
      }

      await loadFromSupabase();
      return true;
    } catch (error) {
      console.error('Save error:',error);
      toast.error('Fejl ved gemning');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const saveReplyToSupabase=async (replyData)=> {
    setLoading(true);
    try {
      const finalReply={
        id: generateUUID(),
        message_id: replyData.messageId,
        parent_reply_id: replyData.parentReplyId || null,
        author_name: replyData.author,
        author_id: replyData.authorId,
        content: replyData.content,
        created_at: new Date().toISOString(),
        likes: replyData.likes || [],
        mentioned_users: replyData.mentionedUsers || []
      };

      const tempReply={
        id: finalReply.id,
        messageId: finalReply.message_id,
        parentReplyId: finalReply.parent_reply_id,
        author: finalReply.author_name,
        authorId: finalReply.author_id,
        content: finalReply.content,
        timestamp: finalReply.created_at,
        likes: finalReply.likes,
        mentionedUsers: finalReply.mentioned_users
      };

      const updatedReplies={...replies};
      if (!updatedReplies[replyData.messageId]) {
        updatedReplies[replyData.messageId]=[];
      }
      updatedReplies[replyData.messageId].push(tempReply);
      setReplies(updatedReplies);
      localStorage.setItem('sommerhus_replies_backup',JSON.stringify(updatedReplies));

      const {error}=await supabase
        .from('message_replies_sommerhus_2024')
        .insert([finalReply]);

      if (error) {
        console.error('Supabase reply save failed:',error);
        toast.error('Fejl ved gemning af svar');
        return false;
      }

      toast.success('Svar gemt!');

      // Send mention notifications
      if (replyData.mentionedUsers && replyData.mentionedUsers.length > 0) {
        await sendMentionNotifications(replyData.mentionedUsers,replyData.messageId,finalReply.id,replyData.author);
      }

      // Send reply notification to original message author
      const originalMessage=messages.find(m=> m.id===replyData.messageId);
      if (originalMessage && originalMessage.authorId !== replyData.authorId) {
        await sendReplyNotification(originalMessage.authorId,originalMessage.id,finalReply.id,replyData.author);
      }

      await loadFromSupabase();
      return true;
    } catch (error) {
      console.error('Save reply error:',error);
      toast.error('Fejl ved gemning');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateReplyInSupabase=async (replyId,newContent)=> {
    setLoading(true);
    try {
      const updatedReplies={...replies};
      Object.keys(updatedReplies).forEach(messageId=> {
        updatedReplies[messageId]=updatedReplies[messageId].map(reply=> 
          reply.id===replyId ? {...reply,content: newContent} : reply
        );
      });
      setReplies(updatedReplies);
      localStorage.setItem('sommerhus_replies_backup',JSON.stringify(updatedReplies));

      const {error}=await supabase
        .from('message_replies_sommerhus_2024')
        .update({content: newContent,updated_at: new Date().toISOString()})
        .eq('id',replyId);

      if (error) {
        console.error('Supabase reply update failed:',error);
        toast.error('Fejl ved opdatering');
        return false;
      }

      toast.success('Svar opdateret!');
      await loadFromSupabase();
      return true;
    } catch (error) {
      console.error('Update reply error:',error);
      toast.error('Fejl ved opdatering');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteFromSupabase=async (id,isReply=false)=> {
    try {
      const table=isReply ? 'message_replies_sommerhus_2024' : 'messages_sommerhus_2024';
      const item=isReply ? Object.values(replies).flat().find(r=> r.id===id) : messages.find(m=> m.id===id);

      if (item?.authorId !== user?.id && !user?.isSuperUser) {
        toast.error('Du kan kun slette dine egne beskeder');
        return;
      }

      if (isReply) {
        const updatedReplies={...replies};
        Object.keys(updatedReplies).forEach(messageId=> {
          updatedReplies[messageId]=updatedReplies[messageId].filter(r=> r.id !== id);
        });
        setReplies(updatedReplies);
        localStorage.setItem('sommerhus_replies_backup',JSON.stringify(updatedReplies));
      } else {
        const updatedMessages=messages.filter(m=> m.id !== id);
        setMessages(updatedMessages);
        localStorage.setItem('sommerhus_messages_backup',JSON.stringify(updatedMessages));
      }

      const {error}=await supabase
        .from(table)
        .delete()
        .eq('id',id);

      if (error) {
        console.error('Supabase delete failed:',error);
        toast.error('Fejl ved sletning');
        return;
      }

      toast.success('Slettet!');
      await loadFromSupabase();
    } catch (error) {
      console.error('Delete error:',error);
      toast.error('Fejl ved sletning');
    }
  };

  const handleLike=async (id,isReply=false)=> {
    try {
      const table=isReply ? 'message_replies_sommerhus_2024' : 'messages_sommerhus_2024';
      let item;
      if (isReply) {
        item=Object.values(replies).flat().find(r=> r.id===id);
      } else {
        item=messages.find(m=> m.id===id);
      }

      if (!item) return;

      const likes=item.likes || [];
      const hasLiked=likes.includes(user.id);
      const updatedLikes=hasLiked 
        ? likes.filter(uid=> uid !== user.id)
        : [...likes,user.id];

      if (isReply) {
        const updatedReplies={...replies};
        Object.keys(updatedReplies).forEach(msgId=> {
          updatedReplies[msgId]=updatedReplies[msgId].map(r=> 
            r.id===id ? {...r,likes: updatedLikes} : r
          );
        });
        setReplies(updatedReplies);
        localStorage.setItem('sommerhus_replies_backup',JSON.stringify(updatedReplies));
      } else {
        const updatedMessages=messages.map(m=> 
          m.id===id ? {...m,likes: updatedLikes} : m
        );
        setMessages(updatedMessages);
        localStorage.setItem('sommerhus_messages_backup',JSON.stringify(updatedMessages));
      }

      const {error}=await supabase
        .from(table)
        .update({likes: updatedLikes})
        .eq('id',id);

      if (error) {
        console.log('Like update failed:',error);
      }
    } catch (error) {
      console.error('Like error:',error);
    }
  };

  useEffect(()=> {
    loadUsers();
    loadFromSupabase();

    const messageChannel=supabase
      .channel('messages-live')
      .on('postgres_changes',{event: '*',schema: 'public',table: 'messages_sommerhus_2024'},(payload)=> {
        setTimeout(()=> loadFromSupabase(),200);
      })
      .subscribe();

    const replyChannel=supabase
      .channel('replies-live')
      .on('postgres_changes',{event: '*',schema: 'public',table: 'message_replies_sommerhus_2024'},(payload)=> {
        setTimeout(()=> loadFromSupabase(),200);
      })
      .subscribe();

    const handleStorageChange=(e)=> {
      if (e.key==='sommerhus_messages_backup' || e.key==='sommerhus_replies_backup') {
        loadFromSupabase();
      }
    };
    window.addEventListener('storage',handleStorageChange);

    const handleVisibilityChange=()=> {
      if (!document.hidden) {
        loadFromSupabase();
      }
    };
    document.addEventListener('visibilitychange',handleVisibilityChange);

    const syncInterval=setInterval(()=> {
      loadFromSupabase();
    },30000);

    return ()=> {
      messageChannel.unsubscribe();
      replyChannel.unsubscribe();
      window.removeEventListener('storage',handleStorageChange);
      document.removeEventListener('visibilitychange',handleVisibilityChange);
      clearInterval(syncInterval);
    };
  },[]);

  const detectMentions=(text,isReplyInput=false)=> {
    const mentionRegex=/@(\w+)/g;
    const matches=[];
    let match;
    while ((match=mentionRegex.exec(text)) !== null) {
      const username=match[1];
      const foundUser=allUsers.find(u=> u.username.toLowerCase()===username.toLowerCase());
      if (foundUser) {
        matches.push(foundUser.id);
      }
    }

    const lastAtIndex=text.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex===text.length - 1) {
      setMentionSuggestions(allUsers);
      setShowMentions(true);
      setCurrentInput(isReplyInput ? 'reply' : 'message');
    } else if (lastAtIndex !== -1) {
      const searchTerm=text.substring(lastAtIndex + 1);
      if (searchTerm && !searchTerm.includes(' ')) {
        const filtered=allUsers.filter(u=> 
          u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setMentionSuggestions(filtered);
        setShowMentions(filtered.length > 0);
        setCurrentInput(isReplyInput ? 'reply' : 'message');
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }

    return matches;
  };

  const selectMention=(selectedUser)=> {
    const currentText=currentInput==='reply' ? replyContent : newMessage;
    const lastAtIndex=currentText.lastIndexOf('@');
    const beforeAt=currentText.substring(0,lastAtIndex);
    const afterAt=currentText.substring(lastAtIndex).split(' ').slice(1).join(' ');
    const newText=`${beforeAt}@${selectedUser.username} ${afterAt}`;

    if (currentInput==='reply') {
      setReplyContent(newText);
    } else {
      setNewMessage(newText);
    }
    setShowMentions(false);
  };

  const renderMessageContent=(content)=> {
    const parts=content.split(/(@\w+)/g);
    return parts.map((part,index)=> {
      if (part.startsWith('@')) {
        const username=part.substring(1);
        const mentionedUser=allUsers.find(u=> u.username.toLowerCase()===username.toLowerCase());
        return (
          <span 
            key={index} 
            className={`text-ebeltoft-blue font-medium bg-blue-50 px-1 rounded ${
              mentionedUser?.id===user.id ? 'bg-yellow-100 text-yellow-800' : ''
            }`}
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleSubmit=(e)=> {
    e.preventDefault();
    if (newMessage.trim()) {
      const mentionedUsers=detectMentions(newMessage);
      const messageData={
        author: user.fullName,
        authorId: user.id,
        content: newMessage,
        likes: [],
        isPinned: false,
        mentionedUsers
      };
      saveMessageToSupabase(messageData);
      setNewMessage('');
    }
  };

  const handleKeyPress=(e)=> {
    if (e.key==='Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleReplyKeyPress=(e)=> {
    if (e.key==='Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReply(replyingTo.messageId,replyingTo.parentReplyId);
    }
  };

  const handleReply=async (messageId,parentReplyId=null)=> {
    if (replyContent.trim()) {
      const mentionedUsers=detectMentions(replyContent,true);
      const replyData={
        messageId,
        parentReplyId,
        author: user.fullName,
        authorId: user.id,
        content: replyContent,
        likes: [],
        mentionedUsers
      };
      await saveReplyToSupabase(replyData);
      setReplyContent('');
      setReplyingTo(null);
    }
  };

  const startEditReply=(reply)=> {
    if (reply.authorId !== user.id && !user?.isSuperUser) {
      toast.error('Du kan kun redigere dine egne svar');
      return;
    }
    setEditingReply(reply.id);
    setEditReplyContent(reply.content);
  };

  const saveEditReply=async ()=> {
    if (editReplyContent.trim()) {
      await updateReplyInSupabase(editingReply,editReplyContent);
      setEditingReply(null);
      setEditReplyContent('');
    }
  };

  const cancelEditReply=()=> {
    setEditingReply(null);
    setEditReplyContent('');
  };

  const togglePin=async (messageId)=> {
    const message=messages.find(m=> m.id===messageId);
    const newPinnedState=!message.isPinned;

    const updatedMessages=messages.map(m=> 
      m.id===messageId ? {...m,isPinned: newPinnedState} : m
    );
    setMessages(updatedMessages);
    localStorage.setItem('sommerhus_messages_backup',JSON.stringify(updatedMessages));

    const {error}=await supabase
      .from('messages_sommerhus_2024')
      .update({is_pinned: newPinnedState})
      .eq('id',messageId);

    if (error) {
      console.log('Pin update failed:',error);
    }

    toast.success(`Besked ${newPinnedState ? 'pinnet' : 'unpinnet'}`);
    loadFromSupabase();
  };

  const toggleReplies=(messageId)=> {
    setShowReplies(prev=> ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const formatTime=(dateString)=> {
    const date=new Date(dateString);
    return date.toLocaleString('da-DK',{
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const buildThreadedReplies=(messageReplies)=> {
    const threaded=[];
    const replyMap=new Map();

    messageReplies.forEach(reply=> {
      replyMap.set(reply.id,{...reply,children: []});
      if (!reply.parentReplyId) {
        threaded.push(replyMap.get(reply.id));
      }
    });

    messageReplies.forEach(reply=> {
      if (reply.parentReplyId && replyMap.has(reply.parentReplyId)) {
        replyMap.get(reply.parentReplyId).children.push(replyMap.get(reply.id));
      }
    });

    return threaded;
  };

  const renderThreadedReply=(reply,depth=0)=> (
    <div key={reply.id} className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''} mt-3`}>
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <SafeIcon icon={FiUser} className="w-4 h-4 text-ebeltoft-blue" />
            <span className="font-medium text-sm text-ebeltoft-dark">{reply.author}</span>
            <span className="text-xs text-gray-500">{formatTime(reply.timestamp)}</span>
            {(reply.likes || []).length > 0 && (
              <span className="text-xs text-red-500 flex items-center gap-1">
                <SafeIcon icon={FiHeart} className="w-3 h-3" />
                {(reply.likes || []).length}
              </span>
            )}
          </div>
        </div>

        {editingReply===reply.id ? (
          <div className="space-y-2">
            <textarea 
              value={editReplyContent}
              onChange={(e)=> setEditReplyContent(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
              rows="2"
            />
            <div className="flex gap-2">
              <button 
                onClick={saveEditReply}
                className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
              >
                <SafeIcon icon={FiSave} className="w-3 h-3" />
              </button>
              <button 
                onClick={cancelEditReply}
                className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
              >
                <SafeIcon icon={FiX} className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 mb-3">{renderMessageContent(reply.content)}</p>
        )}

        {/* 🔥 FIXED: Icons under each reply */}
        <div className="flex items-center gap-4 text-xs">
          <button 
            onClick={()=> handleLike(reply.id,true)}
            className={`flex items-center gap-1 transition-colors ${
              (reply.likes || []).includes(user.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
            }`}
          >
            <SafeIcon icon={FiHeart} className="w-3 h-3" />
            Like
          </button>
          
          <button 
            onClick={()=> setReplyingTo({messageId: reply.messageId,parentReplyId: reply.id})}
            className="flex items-center gap-1 text-gray-400 hover:text-ebeltoft-blue transition-colors"
          >
            <SafeIcon icon={FiCornerDownRight} className="w-3 h-3" />
            Svar
          </button>

          {(reply.authorId===user.id || user?.isSuperUser) && (
            <>
              <button 
                onClick={()=> startEditReply(reply)}
                className="flex items-center gap-1 text-gray-400 hover:text-yellow-500 transition-colors"
              >
                <SafeIcon icon={FiEdit3} className="w-3 h-3" />
                Rediger
              </button>
              
              <button 
                onClick={()=> deleteFromSupabase(reply.id,true)}
                className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <SafeIcon icon={FiTrash2} className="w-3 h-3" />
                Slet
              </button>
            </>
          )}
        </div>
      </div>

      {reply.children && reply.children.map(childReply=> renderThreadedReply(childReply,depth + 1))}
    </div>
  );

  const sortedMessages=[...messages].sort((a,b)=> {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  const backgroundImages=JSON.parse(localStorage.getItem('sommerhus_background_images') || '{}');
  const backgroundImage=backgroundImages.beskedvaeg;

  return (
    <div 
      className={`max-w-4xl mx-auto px-4 pb-8 ${backgroundImage ? 'bg-white/95 backdrop-blur-sm rounded-2xl' : ''}`}
      style={backgroundImage ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      } : {}}
    >
      <div className={`${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-2xl shadow-lg p-6 mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-ebeltoft-dark">Beskedvæg</h2>
          <button 
            onClick={()=> loadFromSupabase(true)}
            disabled={syncing}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <SafeIcon icon={FiRefreshCw} className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncing ? 'Synkroniserer...' : 'Genindlæs'}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input 
                type="text"
                placeholder="Skriv din besked... (Enter for at sende)"
                value={newMessage}
                onChange={(e)=> {
                  setNewMessage(e.target.value);
                  detectMentions(e.target.value);
                }}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
              />

              <AnimatePresence>
                {showMentions && currentInput==='message' && (
                  <motion.div
                    initial={{opacity: 0,y: -10}}
                    animate={{opacity: 1,y: 0}}
                    exit={{opacity: 0,y: -10}}
                    className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto"
                  >
                    {mentionSuggestions.map((suggestionUser)=> (
                      <button 
                        key={suggestionUser.id}
                        type="button"
                        onClick={()=> selectMention(suggestionUser)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                      >
                        <SafeIcon icon={FiAtSign} className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-sm">{suggestionUser.full_name}</div>
                          <div className="text-xs text-gray-500">@{suggestionUser.username}</div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <motion.button 
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors disabled:opacity-50"
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.95}}
            >
              <SafeIcon icon={FiSend} className="w-5 h-5" />
            </motion.button>
          </div>
          <p className="text-xs text-gray-500">
            Skriv @brugernavn for at tagge andre
          </p>
        </form>
      </div>

      <div className="space-y-4">
        {messages.length===0 ? (
          <div className={`${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-xl shadow-md p-8 text-center`}>
            <SafeIcon icon={FiSend} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">Ingen beskeder endnu</h3>
            <p className="text-gray-600">Skriv den første besked til familien!</p>
          </div>
        ) : (
          sortedMessages.map((message)=> {
            const messageReplies=replies[message.id] || [];
            const threadedReplies=buildThreadedReplies(messageReplies);

            return (
              <motion.div 
                key={message.id}
                initial={{opacity: 0,y: 20}}
                animate={{opacity: 1,y: 0}}
                className={`${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-xl shadow-md p-6 ${
                  message.isPinned ? 'border-l-4 border-yellow-400 bg-yellow-50' : ''
                }`}
              >
                {message.isPinned && (
                  <div className="flex items-center gap-2 mb-3 text-yellow-600">
                    <PinIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Fastgjort besked</span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <SafeIcon icon={FiUser} className="w-5 h-5 text-ebeltoft-blue" />
                    <span className="font-medium text-ebeltoft-dark">{message.author}</span>
                    <SafeIcon icon={FiClock} className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{formatTime(message.timestamp)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={()=> togglePin(message.id)}
                      className={`transition-colors ${
                        message.isPinned ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                      }`}
                    >
                      <PinIcon className="w-4 h-4" />
                    </button>
                    {(message.authorId===user.id || user?.isSuperUser) && (
                      <button 
                        onClick={()=> deleteFromSupabase(message.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-gray-700 mb-4">{renderMessageContent(message.content)}</p>

                <div className="flex items-center gap-4 text-sm">
                  <button 
                    onClick={()=> handleLike(message.id)}
                    className={`flex items-center gap-1 transition-colors ${
                      (message.likes || []).includes(user.id) ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                    }`}
                  >
                    <SafeIcon icon={FiHeart} className="w-4 h-4" />
                    <span>{(message.likes || []).length}</span>
                  </button>

                  <button 
                    onClick={()=> setReplyingTo({messageId: message.id,parentReplyId: null})}
                    className="flex items-center gap-1 text-gray-500 hover:text-ebeltoft-blue transition-colors"
                  >
                    <SafeIcon icon={FiMessageCircle} className="w-4 h-4" />
                    <span>Svar</span>
                  </button>

                  {messageReplies.length > 0 && (
                    <button 
                      onClick={()=> toggleReplies(message.id)}
                      className="flex items-center gap-1 text-gray-500 hover:text-ebeltoft-blue transition-colors"
                    >
                      <SafeIcon icon={FiCornerDownRight} className="w-4 h-4" />
                      <span>{messageReplies.length} svar</span>
                    </button>
                  )}
                </div>

                {/* 🔥 FIXED: Show replies BEFORE reply form */}
                <AnimatePresence>
                  {(showReplies[message.id] || messageReplies.length <= 3) && threadedReplies.length > 0 && (
                    <motion.div
                      initial={{opacity: 0,height: 0}}
                      animate={{opacity: 1,height: 'auto'}}
                      exit={{opacity: 0,height: 0}}
                      className="mt-4 space-y-2"
                    >
                      {threadedReplies.map(reply=> renderThreadedReply(reply))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 🔥 FIXED: Reply form comes AFTER replies */}
                <AnimatePresence>
                  {replyingTo?.messageId===message.id && (
                    <motion.div
                      initial={{opacity: 0,height: 0}}
                      animate={{opacity: 1,height: 'auto'}}
                      exit={{opacity: 0,height: 0}}
                      className="mt-4"
                    >
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input 
                            type="text"
                            placeholder={`Svar på ${message.author}s besked... (Enter for at sende)`}
                            value={replyContent}
                            onChange={(e)=> {
                              setReplyContent(e.target.value);
                              detectMentions(e.target.value,true);
                            }}
                            onKeyPress={handleReplyKeyPress}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent text-sm"
                          />

                          <AnimatePresence>
                            {showMentions && currentInput==='reply' && (
                              <motion.div
                                initial={{opacity: 0,y: -10}}
                                animate={{opacity: 1,y: 0}}
                                exit={{opacity: 0,y: -10}}
                                className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto"
                              >
                                {mentionSuggestions.map((suggestionUser)=> (
                                  <button 
                                    key={suggestionUser.id}
                                    type="button"
                                    onClick={()=> selectMention(suggestionUser)}
                                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                                  >
                                    <SafeIcon icon={FiAtSign} className="w-4 h-4 text-gray-400" />
                                    <div>
                                      <div className="font-medium text-sm">{suggestionUser.full_name}</div>
                                      <div className="text-xs text-gray-500">@{suggestionUser.username}</div>
                                    </div>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        <button 
                          onClick={()=> handleReply(replyingTo.messageId,replyingTo.parentReplyId)}
                          className="px-4 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors text-sm"
                        >
                          Send
                        </button>
                        
                        <button 
                          onClick={()=> setReplyingTo(null)}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                        >
                          Luk
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MessageWall;