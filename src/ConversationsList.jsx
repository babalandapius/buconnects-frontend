import React, { useEffect, useState } from 'react';

const ConversationsList = ({ currentUserId, onSelectUser }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!currentUserId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`API_BASE_URL/api/chats/conversations/${currentUserId}`);
        if (res.ok) {
          const data = await res.json();
          setConversations(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [currentUserId]);

  if (loading) return <div className="chat-loading">Loading conversations...</div>;

  return (
    <div className="conversations-list">
      {conversations.length === 0 ? (
        <div className="no-chats">No conversations found.</div>
      ) : (
        /* Notice chatUser is defined here as the parameter inside .map() */
        conversations.map((chatUser) => (
          <div 
            key={chatUser.id} 
            className="conversation-item"
            onClick={() => onSelectUser(chatUser)}
          >
            {/* AVATAR WITH FALLBACK */}
            <div className="avatar-wrapper">
              {chatUser.profile_pic_url ? (
                <img 
                  src={`API_BASE_URL${chatUser.profile_pic_url}`} 
                  alt="" 
                  className="chat-avatar"
                  onError={(e) => { e.target.style.display = 'none'; }} 
                />
              ) : (
                <div className="avatar-placeholder">
                  {chatUser.name ? chatUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>

            {/* DETAILS */}
            <div className="chat-details">
              <div className="chat-header-row">
                <span className="chat-user-name">{chatUser.name}</span>
                {chatUser.unread_count > 0 && (
                  <span className="unread-badge">{chatUser.unread_count}</span>
                )}
              </div>
              <p className="last-message-text">
                {chatUser.last_message || "Start a conversation"}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ConversationsList;