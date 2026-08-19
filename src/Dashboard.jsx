import React, { useEffect, useState } from "react";
import io from 'socket.io-client';
import API_BASE_URL from "./apiConfig";
import Chat from './Chat';
import ConversationsList from "./ConversationsList";
import './style.css';

const socket = io.connect(`${API_BASE_URL}`);

const formatTimeAgo = (dateString) => {
  if (!dateString) return "Recently";
  const now = new Date();
  const postDate = new Date(dateString);
  const diffInSeconds = Math.floor((now - postDate) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return postDate.toLocaleDateString();
};

const getAvatarColor = (name) => {
  const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c'];
  const charCode = name ? name.charCodeAt(0) : 0;
  return colors[charCode % colors.length];
};

const Dashboard = ({ user, onLogout, onUpdateUser }) => {
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [filterCampus, setFilterCampus] = useState(user.campus);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [settingsData, setSettingsData] = useState({ motto: user?.motto || "", password: "" });

  const openChatWith = (partner) => {
    const normalizedPartner = (() => {
      if (!partner) return null;
      if (typeof partner === 'object') {
        return {
          id: partner.id ?? partner.user_id ?? null,
          name: partner.name ?? partner.partner ?? 'Unknown User',
          profile_pic_url: partner.profile_pic_url ?? partner.profile_pic ?? null,
        };
      }

      const found = (Array.isArray(conversations) ? conversations : []).find((c) => {
        const candidateName = c?.name ?? c?.partner;
        return candidateName === partner || c?.partner_id === partner || c?.id === partner;
      });

      if (found) {
        return {
          id: found.id ?? found.partner_id ?? null,
          name: found.name ?? found.partner ?? partner,
          profile_pic_url: found.profile_pic_url ?? found.profile_pic ?? null,
        };
      }

      return { id: null, name: partner, profile_pic_url: null };
    })();

    setActiveChatUser(normalizedPartner);
    setIsChatOpen(true);

    setConversations(prev =>
      (Array.isArray(prev) ? prev : []).map(c => {
        const currentPartner = c?.partner ?? c?.name;
        return currentPartner === normalizedPartner?.name ? { ...c, incomingCount: 0 } : c;
      })
    );
  };

  const [showMarketForm, setShowMarketForm] = useState(false);
  const [itemData, setItemData] = useState({ name: '', price: '', description: '' });
  const [posts, setPosts] = useState(() => {
    try {
      const cached = localStorage.getItem(`posts_${user.id}`);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [marketItems, setMarketItems] = useState([]);
  const [likedMarketItems, setLikedMarketItems] = useState(() => {
    try {
      const saved = localStorage.getItem(`likedMarket_${user.id}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });
  const [hostels, setHostels] = useState([]);
  const [hostelsLoading, setHostelsLoading] = useState(false);
  const [likedHostels, setLikedHostels] = useState(() => {
    try {
      const saved = localStorage.getItem(`likedHostels_${user.id}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });
  const [marketSearch, setMarketSearch] = useState('');
  const [marketMinPrice, setMarketMinPrice] = useState('');
  const [marketMaxPrice, setMarketMaxPrice] = useState('');
  const [marketSort, setMarketSort] = useState('newest');
  const [marketPage, setMarketPage] = useState(1);
  const [marketHasMore, setMarketHasMore] = useState(true);
  const [marketLoading, setMarketLoading] = useState(false);
  const [postText, setPostText] = useState("");
  const [activeTab, setActiveTab] = useState("feed");
  const [selectedChatPartner, setSelectedChatPartner] = useState("Admin");
  const [selectedFile, setSelectedFile] = useState(null);
  const [marketFile, setMarketFile] = useState(null);
  const [hostelFile, setHostelFile] = useState(null);
  const [hostelStatus, setHostelStatus] = useState('');
  const [marketStatus, setMarketStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [profileFile, setProfileFile] = useState(null); 
  const [events, setEvents] = useState([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventData, setEventData] = useState({ title: '', location: '', event_date: '', event_time: '', description: '' });
  const [showHostelForm, setShowHostelForm] = useState(false);
  const [hostelData, setHostelData] = useState({ name: '', location: '', description: '', price: '', contact: '' });
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementData, setAnnouncementData] = useState({ title: '', content: '', target: 'all' });
  const [notifications, setNotifications] = useState([]);
  const [comments, setComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [showComments, setShowComments] = useState(null);
  const [showPostFab, setShowPostFab] = useState(false);

  const [likedPosts, setLikedPosts] = useState(() => {
    try {
      const saved = localStorage.getItem(`likedPosts_${user.id}`);
      return new Set(saved ? JSON.parse(saved) : []);
    } catch (e) {
      return new Set();
    }
  });
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedMediaPost, setSelectedMediaPost] = useState(null);
  const [conversations, setConversations] = useState([]); // { partner, lastMessage, lastAt, incomingCount }

  const [convoModalOpen, setConvoModalOpen] = useState(false);
  const [selectedConversationModalPartner, setSelectedConversationModalPartner] = useState(null);

const [unreadCounts, setUnreadCounts] = useState(() => {
  try {
    const cached = localStorage.getItem(`unread_${user?.id}`);
    return cached ? JSON.parse(cached) : {};
  } catch (e) {
    return {};
  }
});

// Calculate total unread count for the main badge
const totalUnreadCount = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  const unreadCount = conversations.reduce((sum, c) => sum + (c.incomingCount || 0), 0);

  const fetchConversations = async () => {
  // Check for user ID instead of user.name
  const userId = user?.id || user?.user_id;
  
  if (!userId) {
    console.warn("fetchConversations: Logged in user ID is missing!", user);
    return;
  }

  try {
    console.log("Fetching conversations for user ID:", userId);
    
    // Request endpoint using user ID
    const res = await fetch(`${API_BASE_URL}/api/chats/conversations/${userId}`);
    
    if (!res.ok) {
      console.error('Failed to fetch conversations. Server status:', res.status);
      return;
    }
    
    const data = await res.json();
    console.log("Fetched Conversations Response:", data);
    
    setConversations(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('Error loading conversations:', err);
  }
};

useEffect(() => {
  const userId = user?.id || user?.user_id;
  if (userId) {
    fetchConversations();
  }
}, [user?.id, user?.user_id]);

  const ConversationsModal = ({ open, onClose, items, onSelect }) => {
    if (!open) return null;
    return (
      <div className="convo-modal-overlay" onClick={onClose}>
        <div className="convo-modal" onClick={(e) => e.stopPropagation()}>
          <div className="convo-modal-header">
            <strong>Messages</strong>
            <button className="close-modal" onClick={onClose}>✕</button>
          </div>
          <div className="convo-modal-body">
            {items.length === 0 && <div className="no-convos">No recent messages</div>}
            {items.map(conv => (
              <div key={conv.partner} className="convo-item modal-item" onClick={() => { onSelect(conv.partner); onClose(); }}>
                <div className="convo-avatar" style={{backgroundColor: getAvatarColor(conv.partner)}}>{conv.partner.charAt(0).toUpperCase()}</div>
                <div className="convo-meta">
                  <div className="convo-top">
                    <strong>{conv.partner}</strong>
                    <small className="convo-time">{conv.lastAt ? new Date(conv.lastAt).toLocaleTimeString() : ''}</small>
                  </div>
                  <div className="convo-last">{conv.lastMessage ? conv.lastMessage.slice(0, 80) : 'No messages yet'}</div>
                </div>
                {conv.incomingCount > 0 && <div className="convo-badge">{conv.incomingCount}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // --- DERIVED DATA (FOR SCROLLER) ---
  const recentUpdateImages = (Array.isArray(posts) ? posts : [])
    .filter(post => post?.media_url && post?.media_type === 'image')
    .slice(0, 5);
  // slider state
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (recentUpdateImages.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % recentUpdateImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [recentUpdateImages]);


  const handleNavClick = (tab) => {
  setActiveTab(tab);
  setIsMenuOpen(false); // Close menu after picking an option
};

  useEffect(() => {
    if (window.Notification && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(`likedPosts_${user.id}`, JSON.stringify(Array.from(likedPosts)));
  }, [likedPosts, user.id]);

  useEffect(() => {
    const onWindowScroll = () => setShowPostFab(window.scrollY > 200);
    const container = document.querySelector('.main-content');
    const onContainerScroll = () => {
      if (container) setShowPostFab(container.scrollTop > 200);
    };
    window.addEventListener('scroll', onWindowScroll, { passive: true });
    if (container) container.addEventListener('scroll', onContainerScroll);
    return () => {
      window.removeEventListener('scroll', onWindowScroll);
      if (container) container.removeEventListener('scroll', onContainerScroll);
    };
  }, []);



  // --- FUNCTIONS: FEED & POSTS ---
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const fetchPosts = async (nextPage = 1, reset = false) => {
    if (loadingPosts) return;
    if (!hasMore && !reset) return;
    setLoadingPosts(true);
    if (reset) setHasMore(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts?campus=${user.campus}&page=${nextPage}&limit=20`);
      const data = await response.json();
      if (data.length < 20) setHasMore(false);
      setPosts(prev => {
        const merged = nextPage === 1 ? data : [...prev, ...data];
        try {
          localStorage.setItem(`posts_${user.id}`, JSON.stringify(merged));
        } catch (e) {}
        return merged;
      });
      // initialize comments if new
      setComments(prev => {
        const commentsObj = { ...prev };
        data.forEach(post => {
          if (!(post.id in commentsObj)) commentsObj[post.id] = post.comments || [];
        });
        return commentsObj;
      });
      setPage(nextPage);
    } catch (error) { console.error('Error fetching posts:', error); }
    setLoadingPosts(false);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postText.trim() && !selectedFile) return;

    const formData = new FormData();
    formData.append('author', user.name);
    formData.append('content', postText);
    formData.append('campus', user.campus);
    if (selectedFile) formData.append('media', selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        setPostText("");
        setSelectedFile(null);
        setPage(1);
        fetchPosts(1, true);
      }
    } catch (error) { console.error("Post failed", error); }
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm("Are you sure?")) {
      await fetch(`${API_BASE_URL}/api/posts/${postId}`, { method: 'DELETE' });
      fetchPosts();
    }
  };

  // --- FUNCTIONS: SETTINGS & PROFILE ---
  const handleUpdateSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          motto: settingsData.motto,
          password: settingsData.password
        })
      });
      if (response.ok) {
        alert("Settings updated! Logging out to refresh.");
        onLogout();
      }
    } catch (error) { console.error("Update failed", error); }
  };

  const handleProfilePicUpload = async () => {
    if (!profileFile) return alert("Select a file first");
    const formData = new FormData();
    formData.append('image', profileFile);
    formData.append('userId', user.id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/profile-pic`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        // backend may not return user; fetch latest data explicitly
        try {
          const userRes = await fetch(`${API_BASE_URL}/api/user/${user.id}`);
          if (userRes.ok) {
            const latest = await userRes.json();
            onUpdateUser(latest);
          } else {
            window.location.reload();
          }
        } catch (err) {
          console.error('Could not refresh user', err);
          window.location.reload();
        }
        setProfileFile(null); // clear selection after upload
      }
    } catch (err) { console.error(err); }
  };

  // --- FUNCTIONS: MARKET & EVENTS & NOTIFS ---
  const buildMarketQuery = (pageNumber) => {
    const params = new URLSearchParams();
    params.append('campus', user.campus);
    if (marketSearch.trim()) params.append('search', marketSearch.trim());
    if (marketMinPrice) params.append('minPrice', marketMinPrice);
    if (marketMaxPrice) params.append('maxPrice', marketMaxPrice);
    if (marketSort) params.append('sort', marketSort);
    params.append('page', pageNumber);
    params.append('limit', 20);
    return params.toString();
  };

  const fetchMarketItems = async (pageNumber = 1, reset = false) => {
    if (marketLoading) return;
    if (!marketHasMore && !reset && pageNumber !== 1) return;
    setMarketLoading(true);
    try {
      if (reset) {
        setMarketPage(1);
        setMarketHasMore(true);
      }
      const query = buildMarketQuery(pageNumber);
      const res = await fetch(`${API_BASE_URL}/api/market?${query}`);
      const data = await res.json();
      setMarketItems(prev => (reset ? data : [...prev, ...data]));
      if (data.length < 20) setMarketHasMore(false);
      setMarketPage(pageNumber);
    } catch (e) {
      console.error('Error fetching market items', e);
    }
    setMarketLoading(false);
  };

  const fetchHostels = async () => {
    setHostelsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/hostels`);
      if (res.ok) {
        const data = await res.json();
        setHostels(Array.isArray(data) ? data : []);
      } else {
        setHostels([]);
      }
    } catch (e) {
      console.error('Error fetching hostels', e);
      setHostels([]);
    }
    setHostelsLoading(false);
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/announcements?campus=${user.campus}`);
      const data = await res.json();
      setAnnouncements(data);
    } catch (e) {
      console.error('Error fetching announcements', e);
    }
  };

  const handlePostItem = async () => {
    const formData = new FormData();
    formData.append('name', itemData.name);
    formData.append('price', itemData.price);
    formData.append('description', itemData.description);
    formData.append('seller', user.name);
    formData.append('campus', user.campus);
    if (marketFile) formData.append('image', marketFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/market`, { method: 'POST', body: formData });
      if (res.ok) {
        setShowMarketForm(false);
        setItemData({ name: '', price: '', description: '' });
        setMarketFile(null);
        setMarketPage(1);
        setMarketStatus('Item posted successfully!');
        fetchMarketItems(1, true);
      } else {
        const errorData = await res.json();
        setMarketStatus(errorData.error || 'Failed to post item.');
      }
    } catch (e) {
      console.error('Market post failed', e);
      setMarketStatus('Failed to post item.');
    }
  };

  const handlePostHostel = async () => {
    setHostelStatus('');
    const formData = new FormData();
    formData.append('name', hostelData.name);
    formData.append('location', hostelData.location);
    formData.append('description', hostelData.description);
    formData.append('price', hostelData.price);
    formData.append('contact', hostelData.contact);
    formData.append('poster', user.name);
    formData.append('campus', user.campus);
    if (hostelFile) formData.append('image', hostelFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/hostels`, { method: 'POST', body: formData });
      if (res.ok) {
        setShowHostelForm(false);
        setHostelData({ name: '', location: '', description: '', price: '', contact: '' });
        setHostelFile(null);
        setHostelStatus('Hostel posted successfully!');
        fetchHostels();
      } else {
        const errorData = await res.json();
        setHostelStatus(errorData.error || 'Failed to post hostel.');
      }
    } catch (e) {
      console.error('Hostel post failed', e);
      setHostelStatus('Failed to post hostel.');
    }
  };

  const handlePostAnnouncement = async () => {
    const res = await fetch(`${API_BASE_URL}/api/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...announcementData, poster: user.name })
    });
    if (res.ok) {
      setShowAnnouncementForm(false);
      setAnnouncementData({ title: '', content: '', target: 'all' });
      fetchAnnouncements();
    }
  };

  const fetchComments = async (postId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments`);
      const data = await res.json();
      const normalized = data.map(comment => ({
        id: comment.id,
        userName: comment.user_name || comment.userName,
        text: comment.comment_text || comment.text
      }));
      setComments(prev => ({ ...prev, [postId]: normalized }));
    } catch (err) {
      console.error('Failed to load comments', err);
    }
  };

  const handleSendComment = async (postId) => {
    const text = (commentDrafts[postId] || '').trim();
    if (!text) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, userName: user.name, text })
      });
      if (response.ok) {
        setComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), { id: Date.now(), userName: user.name, text }] // temp id
        }));
        setCommentDrafts(prev => ({ ...prev, [postId]: '' }));
        fetchComments(postId); // refresh to get real id
      }
    } catch (err) {
      console.error('Comment submit failed', err);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/comment/${commentId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setComments(prev => ({
          ...prev,
          [postId]: prev[postId].filter(c => c.id !== commentId)
        }));
      }
    } catch (err) {
      console.error('Delete comment failed', err);
    }
  };

  const fetchEvents = async () => {
    const res = await fetch(`${API_BASE_URL}/api/events?campus=${user.campus}`);
    setEvents(await res.json());
  };

  const fetchNotifications = async () => {
    const res = await fetch(`${API_BASE_URL}/api/notifications/${user.id}`);
    setNotifications(await res.json());
  };

  // --- EFFECTS ---
  useEffect(() => { 
    // reset when campus changes
    setPage(1);
    setHasMore(true);
    fetchPosts(1, true);
  }, [user.campus]);

  // listen for incoming chat messages to add simple notifications
useEffect(() => {
  if (!socket) return;

  // Clean up any existing listener before attaching a new one
  socket.off('receive_message');

  socket.on('receive_message', (data) => {
    // Match by name or ID
    const isForCurrentUser = data.receiver === user?.name || data.receiver_id === user?.id;

    if (isForCurrentUser) {
      // 1. Trigger Notification
      const note = { 
        id: Date.now(), 
        actorName: data.sender, 
        type: 'message', 
        is_read: false 
      };
      setNotifications(prev => [note, ...(Array.isArray(prev) ? prev : [])]);

      if (window.Notification && Notification.permission === 'granted') {
        new Notification('New message', { body: `Message from ${data.sender}` });
      }

      // 2. Update Conversations List & Unread Counter
      setConversations(prev => {
        const copy = Array.isArray(prev) ? [...prev] : [];
        const idx = copy.findIndex(c => c.partner === data.sender || c.partner_id === data.sender_id);

        // Check if we are currently chatting with this person in an open chat window
        const isActivelyChatting = 
          isChatOpen && (activeChatUser?.name === data.sender || activeChatUser?.id === data.sender_id);

        if (idx >= 0) {
          const item = { ...copy[idx] };
          item.lastMessage = data.message;
          item.lastAt = new Date().toISOString();
          
          // Only increment unread count if the chat with this user isn't currently open
          if (!isActivelyChatting) {
            item.incomingCount = (item.incomingCount || 0) + 1;
          }

          // Move this conversation to the top of the list
          copy.splice(idx, 1);
          copy.unshift(item);
          return copy;
        }

        // New conversation item
        return [{ 
          partner: data.sender, 
          partner_id: data.sender_id,
          lastMessage: data.message, 
          lastAt: new Date().toISOString(), 
          incomingCount: isActivelyChatting ? 0 : 1 
        }, ...copy];
      });
    }
  });

  return () => {
    socket.off('receive_message');
  };
}, [user?.name, user?.id, isChatOpen, activeChatUser]);

  // real-time feed updates
  useEffect(() => {
    socket.on('new_post', (post) => {
      // only care about updates from our campus
      if (post.campus === user.campus) {
        setPosts(prev => [post, ...prev]);
        const note = { id: Date.now(), actorName: post.author, type: 'new_post', is_read: false };
        setNotifications(prev => [note, ...prev]);
        if (window.Notification && Notification.permission === 'granted') {
          new Notification('New campus update', { body: `${post.author}: ${post.content?.slice(0,50) || ''}` });
        }
      }
    });
    return () => socket.off('new_post');
  }, [user.campus]);
  // refetch when active tab changes or filters reset when leaving
  useEffect(() => {
    if (activeTab === 'market') {
      fetchMarketItems(1, true);
    }
    if (activeTab === 'hostels') {
      fetchHostels();
    }
    if (activeTab === 'events') fetchEvents();
    if (activeTab === 'announcements') fetchAnnouncements();
    if (activeTab === 'notifications') {
      const markReadAndLoad = async () => {
        await fetch(`${API_BASE_URL}/api/notifications/read/${user.id}`, { method: 'PUT' });
        fetchNotifications();
        setNotifications(prev => prev.map(notification => ({ ...notification, is_read: true })));
      };
      markReadAndLoad();
    }
  }, [activeTab]);

  // refetch when any filter value changes
  useEffect(() => {
    if (activeTab === 'market') {
      fetchMarketItems(1, true);
    }
  }, [marketSearch, marketMinPrice, marketMaxPrice, marketSort]);

  // infinite scroll for marketplace
  const [marketObserverRef, setMarketObserverRef] = useState(null);
  useEffect(() => {
    if (!marketObserverRef || marketLoading || !marketHasMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          fetchMarketItems(marketPage + 1);
        }
      },
      { root: document.querySelector('.main-content'), threshold: 1.0 }
    );
    observer.observe(marketObserverRef);
    return () => observer.disconnect();
  }, [marketObserverRef, marketLoading, marketHasMore, marketPage]);

  // intersection observer ref state
  const [observerRef, setObserverRef] = useState(null);

  // attach observer for infinite loading
  useEffect(() => {
    if (!observerRef || loadingPosts || !hasMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          fetchPosts(page + 1);
        }
      },
      { root: document.querySelector('.main-content'), threshold: 1.0 }
    );
    observer.observe(observerRef);
    return () => observer.disconnect();
  }, [observerRef, page, loadingPosts, hasMore]);

  return (
    <div className="dashboard-wrapper">
      {/* 1. SIDEBAR */}
      <aside className={`side-nav ${isMenuOpen ? 'menu-open' : ''}`}>
        <h2 className="brand-name">bu-CONNECTS</h2>
        <div className="user-profile">
          {user.profile_pic_url && (
            <img
              src={`${API_BASE_URL}${user.profile_pic_url}`}
              alt="avatar"
              className="sidebar-avatar"
            />
          )}
          <div className="user-info">
            <p className="welcome-text">Welcome,</p>
            <h3 className="user-name">{user.name}</h3>
            <span className="campus-badge">{user.campus}</span>
          </div>
        </div>
        <ul className="nav-links">
          <li onClick={() => setActiveTab('feed')} className={activeTab === 'feed' ? 'active-li' : ''}>Home Feed</li>
          <li onClick={() => setActiveTab('market')} className={activeTab === 'market' ? 'active-li' : ''}>Market Place</li>
          <li onClick={() => setActiveTab('hostels')} className={activeTab === 'hostels' ? 'active-li' : ''}>Hostels</li>
          <li onClick={() => setActiveTab('events')} className={activeTab === 'events' ? 'active-li' : ''}>Campus Events</li>
          <li onClick={() => setActiveTab('notifications')} className={activeTab === 'notifications' ? 'active-li' : ''}>
            Notifications {notifications.filter(n => !n.is_read).length > 0 && <span className="notif-badge">!</span>}
          </li>
          {user.is_admin && (
            <li onClick={() => setActiveTab('announcements')} className={activeTab === 'announcements' ? 'active-li' : ''}>Announcements</li>
          )}
          <li onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'active-li' : ''}>My Profile</li>
          <li onClick={() => setActiveTab('settings')} className={activeTab === 'settings' ? 'active-li' : ''}>Settings</li>
        </ul>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </aside>
      {isMenuOpen && <div className="menu-overlay" onClick={() => setIsMenuOpen(false)}></div>}

      {/* 2. MAIN CONTENT */}

      <main className="main-content">
        <header className="feed-header">
          <h1>{activeTab === 'feed' ? `${user.campus} Updates` : activeTab.toUpperCase()}</h1>
        </header>

        {/* IMAGE SLIDER - restored and placed under header */}
        {recentUpdateImages.length > 0 && (
          <div className="top-image-slider">
            <div className="slider-inner">
              <button className="slider-arrow left" onClick={() => setCurrentSlide((currentSlide - 1 + recentUpdateImages.length) % recentUpdateImages.length)}>‹</button>
              <img
                src={`${API_BASE_URL}${recentUpdateImages[currentSlide].media_url}`}
                alt="highlight"
                className="slider-img"
                onClick={() => { setSelectedMediaPost(recentUpdateImages[currentSlide]); setShowMediaModal(true); }}
              />
              <button className="slider-arrow right" onClick={() => setCurrentSlide((currentSlide + 1) % recentUpdateImages.length)}>›</button>
            </div>
            <div className="slider-indicators">
              {recentUpdateImages.map((_, idx) => (
                <span key={idx} className={idx === currentSlide ? 'active' : ''} onClick={() => setCurrentSlide(idx)}></span>
              ))}
            </div>
          </div>
        )}

        {/* FEED VIEW */}
        {activeTab === 'feed' && (
          <>
            <div className={`post-card create-post-container${isDragging ? ' dragover' : ''}`}
                 onDragOver={(e)=>{ e.preventDefault(); setIsDragging(true); }}
                 onDragLeave={() => setIsDragging(false)}
                 onDrop={(e)=>{ e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files && e.dataTransfer.files[0]) setSelectedFile(e.dataTransfer.files[0]); }}>
              <form onSubmit={handleCreatePost}>
                <textarea
                  placeholder="What's happening at your Campus?"
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  className="post-input"
                />
                <div className="post-actions-row">
                  <input type="file" accept="image/*,video/*" onChange={(e) => setSelectedFile(e.target.files[0])} id="media-upload" hidden />
                  <label htmlFor="media-upload" className="media-label">
                    {selectedFile ? `📎 ${selectedFile.name}` : "🖼️ Add Photo/Video"}
                  </label>
                  <button type="submit" className="post-button">Post Update</button>
                </div>
              </form>
            </div>

           <div className="feed-list">
    {(Array.isArray(posts) ? posts : []).map((post, idx) => (
      <div key={post?.id || idx} className="post-card">
        <div className="post-meta">
          <div className="author-details">
            <div className="avatar-circle" style={{ backgroundColor: getAvatarColor(post?.author) }}>
              {post?.author ? post.author.charAt(0).toUpperCase() : '?'}
            </div>
            <strong className="author-clickable" onClick={() => openChatWith(post?.author)}>
              {post?.author}
            </strong>
          </div>
          <div className="post-meta-details">
            <span className="campus-tag">{post?.campus}</span>
            <span className="post-time">• {formatTimeAgo(post?.created_at)}</span>
          </div>
        </div>
        <p className="post-content">{post?.content}</p>

        {post?.media_url && (
          <div className="post-media-container" onClick={() => { setSelectedMediaPost(post); setShowMediaModal(true); }}>
            {post?.media_type === 'video' ? (
              <video controls className="post-media-content">
                <source src={`${API_BASE_URL}${post.media_url}`} type="video/mp4" />
              </video>
            ) : (
              <img src={`${API_BASE_URL}${post.media_url}`} alt="post" className="post-media-content" />
            )}
          </div>
        )}

        <div className="post-interactions">
          <button
            className={`interaction-btn like-btn ${likedPosts?.has(post?.id) ? 'liked' : ''}`}
            onClick={async () => {
              if (!post?.id) return;
              // Toggle like state locally
              setLikedPosts(prev => {
                const newSet = new Set(prev);
                if (newSet.has(post.id)) {
                  newSet.delete(post.id);
                } else {
                  newSet.add(post.id);
                }
                return newSet;
              });
              // Send to backend
              try {
                await fetch(`${API_BASE_URL}/api/posts/like`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ postId: post.id, userId: user?.id })
                });
              } catch (err) {
                console.error('Error toggling like:', err);
              }
            }}
          >
            {likedPosts?.has(post?.id) ? '❤️' : '🤍'} {likedPosts?.has(post?.id) ? 'Liked' : 'Like'}
          </button>

        <button 
          className="interaction-btn" 
          onClick={() => {
            const next = showComments === post?.id ? null : post?.id;
            setShowComments(next);
            if (next) fetchComments(post.id);
          }}
        >
          💬 {showComments === post?.id ? 'Hide' : 'View'} Comments
        </button>
      </div>

      {/* Display Comments Section - Facebook Style */}
      {showComments === post?.id && (
        <div className="facebook-comments-section">
          {/* Display Existing Comments */}
          {Array.isArray(comments[post.id]) && comments[post.id].length > 0 && (
            <div className="comments-list">
              {comments[post.id].map((comment, commentIdx) => (
                <div key={comment?.id || commentIdx} className="facebook-comment-item">
                  <div className="comment-avatar">
                    {comment?.userName ? comment.userName.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="comment-content">
                    <strong>{comment?.userName}</strong>
                    <p>{comment?.text}</p>
                    {comment?.userName === user?.name && (
                      <button
                        className="comment-delete-btn"
                        onClick={() => handleDeleteComment(post.id, comment.id)}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment Input */}
          <div className="facebook-comment-input">
            <div className="comment-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
            </div>
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentDrafts[post.id] || ''}
              onChange={(e) => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendComment(post.id);
                }
              }}
            />
            <button
              type="button"
              className="comment-send-btn"
              onClick={() => handleSendComment(post.id)}
            >
              Send
            </button>
          </div>
        </div>
      )}

      <div className="post-actions">
        <button className="action-btn" onClick={() => openChatWith(post?.author)}>Message</button>
        {post?.author === user?.name && (
          <button className="delete-btn" onClick={() => handleDeletePost(post.id)}>Delete</button>
        )}
      </div>
    </div>
  ))}
</div>
              <div ref={el => setObserverRef(el)} className="infinite-sentinel" style={{height:'1px'}}></div>
              {loadingPosts && <p className="loading-indicator">Loading more updates...</p>}
          </>
        )}

        {/* PROFILE VIEW */}
        {activeTab === 'profile' && (
          <div className="profile-section">
            <div className="profile-header-card">
              <div className="profile-avatar-large" style={{ backgroundColor: getAvatarColor(user.name) }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="profile-info">
                <h2>{user.name}</h2>
                <p className="user-motto">"{user.motto || "No motto set yet"}"</p>
                <p className="campus-badge">{user.campus}</p>
                <div className="profile-stats">
                  <span><strong>{posts.filter(p => p.author === user.name).length}</strong> Posts</span>
                  <span><strong>{marketItems.filter(m => m.seller === user.name).length}</strong> Items</span>
                </div>
              </div>
            </div>
            <div className="profile-content-grid">
              <div className="my-posts">
                <h3>My Recent Activity</h3>
                {posts.filter(p => p.author === user.name).map(post => (
                  <div key={post.id} className="post-card mini-post">
                    <p>{post.content}</p>
                    <button className="delete-btn" onClick={() => handleDeletePost(post.id)}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MARKETPLACE VIEW */}
        {activeTab === 'market' && (
          <div className="market-section">
            <div className="market-header-actions">
              <h2>Campus Marketplace</h2>
              <button className="sell-toggle-btn" onClick={() => {
                setShowMarketForm(prev => !prev);
                setMarketStatus('');
                if (showMarketForm) setMarketFile(null);
              }}>
                {showMarketForm ? "Close Form" : "Sell an Item"}
              </button>
            </div>

            {/* filters/search bar */}
            <div className="market-filters">
              <input
                type="text"
                placeholder="Search items..."
                value={marketSearch}
                onChange={e => setMarketSearch(e.target.value)}
              />
              <input
                type="number"
                placeholder="Min price"
                value={marketMinPrice}
                onChange={e => setMarketMinPrice(e.target.value)}
                min="0"
              />
              <input
                type="number"
                placeholder="Max price"
                value={marketMaxPrice}
                onChange={e => setMarketMaxPrice(e.target.value)}
                min="0"
              />
              <select value={marketSort} onChange={e => setMarketSort(e.target.value)}>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

            {showMarketForm && (
              <div className="post-card market-form">
                <h3>List New Item</h3>
                <input type="text" placeholder="Item Name" value={itemData.name} onChange={(e) => setItemData({ ...itemData, name: e.target.value })} />
                <input type="number" placeholder="Price" value={itemData.price} onChange={(e) => setItemData({ ...itemData, price: e.target.value })} />
                <input type="file" onChange={(e) => setMarketFile(e.target.files[0])} />
                <textarea placeholder="Description" value={itemData.description} onChange={(e) => setItemData({ ...itemData, description: e.target.value })} />
                <button type="button" className="post-button" onClick={handlePostItem}>Post Item</button>
                {marketStatus && <p className="status-message">{marketStatus}</p>}
              </div>
            )}
            <div className="market-grid">
              {marketItems.map((item) => (
                <div key={item.id} className="market-card">
                  <div className="item-img-container">
                    {item.image_url ? <img src={`${API_BASE_URL}${item.image_url}`} className="item-img" alt="item" /> : <div className="item-img-placeholder">🛒</div>}
                  </div>
                  <div className="item-info">
                    <div className="market-card-header">
                      <h4>{item.name}</h4>
                      <button
                        className={`like-btn ${likedMarketItems.has(item.id) ? 'liked' : ''}`}
                        onClick={() => {
                          setLikedMarketItems(prev => {
                            const copy = new Set(prev);
                            if (copy.has(item.id)) copy.delete(item.id);
                            else copy.add(item.id);
                            localStorage.setItem(`likedMarket_${user.id}`, JSON.stringify(Array.from(copy)));
                            return copy;
                          });
                        }}
                      >
                        {likedMarketItems.has(item.id) ? '💖' : '🤍'}
                      </button>
                    </div>
                    <p className="price">UGX {item.price}</p>
                    <p className="seller-name">Seller: {item.seller}</p>
                    <button className="buy-btn" onClick={() => openChatWith(item.seller)}>Inquire</button>
                  </div>
                </div>
              ))}
              {marketLoading && <p className="loading-indicator">Loading more items...</p>}
              <div ref={el => setMarketObserverRef(el)} style={{height:'1px'}}></div>
            </div>
          </div>
        )}

        {/* HOSTELS VIEW */}
        {activeTab === 'hostels' && (
          <div className="market-section">
            <div className="market-header-actions">
              <h2>Available Hostels</h2>
              <button className="sell-toggle-btn" onClick={() => {
                setShowHostelForm(prev => !prev);
                setHostelStatus('');
                if (showHostelForm) setHostelFile(null);
              }}>
                {showHostelForm ? "Close Form" : "Post Hostel"}
              </button>
            </div>

            {showHostelForm && (
              <div className="post-card market-form">
                <h3>Post New Hostel</h3>
                <input type="text" placeholder="Hostel Name" value={hostelData.name} onChange={(e) => setHostelData({ ...hostelData, name: e.target.value })} />
                <input type="text" placeholder="Location" value={hostelData.location} onChange={(e) => setHostelData({ ...hostelData, location: e.target.value })} />
                <input type="number" placeholder="Price per month" value={hostelData.price} onChange={(e) => setHostelData({ ...hostelData, price: e.target.value })} />
                <input type="text" placeholder="Contact Info" value={hostelData.contact} onChange={(e) => setHostelData({ ...hostelData, contact: e.target.value })} />
                <input type="file" accept="image/*" onChange={(e) => setHostelFile(e.target.files[0])} />
                <textarea placeholder="Description" value={hostelData.description} onChange={(e) => setHostelData({ ...hostelData, description: e.target.value })} />
                <button type="button" className="post-button" onClick={handlePostHostel}>Submit Hostel</button>
                {hostelStatus && <p className="status-message">{hostelStatus}</p>}
              </div>
            )}
            <div className="market-grid">
              {hostels.map((hostel, index) => (
                <div key={hostel.id || index} className="market-card">
                  <div className="item-img-container">
                    {hostel.image_url ? <img src={`${API_BASE_URL}${hostel.image_url}`} className="item-img" alt="hostel" /> : <div className="item-img-placeholder">🏠</div>}
                  </div>
                  <div className="item-info">
                    <div className="market-card-header">
                      <h4>{hostel.name}</h4>
                      <button
                        className={`like-btn ${likedHostels.has(hostel.id) ? 'liked' : ''}`}
                        onClick={() => {
                          setLikedHostels(prev => {
                            const copy = new Set(prev);
                            if (copy.has(hostel.id)) copy.delete(hostel.id);
                            else copy.add(hostel.id);
                            localStorage.setItem(`likedHostels_${user.id}`, JSON.stringify(Array.from(copy)));
                            return copy;
                          });
                          // API call
                          fetch(`${API_BASE_URL}/api/hostels/${hostel.id}/like`, { method: 'POST' });
                        }}
                      >
                        {likedHostels.has(hostel.id) ? '💖' : '🤍'} {hostel.likes || 0}
                      </button>
                    </div>
                    <p className="price">UGX {hostel.price}/month</p>
                    <p className="seller-name">Location: {hostel.location}</p>
                    <p className="seller-name">Contact: {hostel.contact}</p>
                    <button className="buy-btn" onClick={() => openChatWith(hostel.poster)}>Inquire</button>
                  </div>
                </div>
              ))}
              {hostelsLoading && <p className="loading-indicator">Loading hostels...</p>}
            </div>
          </div>
        )}

        {/* EVENTS VIEW */}
        {activeTab === 'events' && (
          <div className="events-section">
            <div className="market-header-actions">
              <h2>Campus Events</h2>
              <button className="sell-toggle-btn" onClick={() => setShowEventForm(!showEventForm)}>Post Event</button>
            </div>
            {showEventForm && (
              <div className="post-card market-form">
                <input type="text" placeholder="Title" onChange={(e) => setEventData({ ...eventData, title: e.target.value })} />
                <input type="date" onChange={(e) => setEventData({ ...eventData, event_date: e.target.value })} />
                <button className="post-button" onClick={async () => {
                  await fetch(`${API_BASE_URL}/api/events`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...eventData, campus: user.campus })
                  });
                  setShowEventForm(false); fetchEvents();
                }}>Create</button>
              </div>
            )}
            <div className="events-list">
              {events.map(event => (
                <div key={event.id} className="event-card">
                  <div className="event-date"><span className="month">{event.month}</span><span className="day">{event.day}</span></div>
                  <div className="event-info"><h3>{event.title}</h3><p>{event.location}</p></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS VIEW */}
        {activeTab === 'announcements' && user.is_admin && (
          <div className="market-section">
            <div className="market-header-actions">
              <h2>Campus Announcements</h2>
              <button className="sell-toggle-btn" onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}>
                {showAnnouncementForm ? "Close Form" : "Post Announcement"}
              </button>
            </div>

            {showAnnouncementForm && (
              <div className="post-card market-form">
                <h3>Post New Announcement</h3>
                <input type="text" placeholder="Title" value={announcementData.title} onChange={(e) => setAnnouncementData({ ...announcementData, title: e.target.value })} />
                <select value={announcementData.target} onChange={(e) => setAnnouncementData({ ...announcementData, target: e.target.value })}>
                  <option value="all">All Campuses</option>
                  <option value={user.campus}>This Campus Only</option>
                </select>
                <textarea placeholder="Content" value={announcementData.content} onChange={(e) => setAnnouncementData({ ...announcementData, content: e.target.value })} />
                <button className="post-button" onClick={handlePostAnnouncement}>Post Announcement</button>
              </div>
            )}
            <div className="announcements-list">
              {announcements.map((ann) => (
                <div key={ann.id} className="post-card">
                  <h3>{ann.title}</h3>
                  <p>{ann.content}</p>
                  <small>Posted by {ann.poster} • {formatTimeAgo(ann.created_at)}</small>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS VIEW */}
        {activeTab === 'settings' && (
          <div className="settings-container">
            <div className="post-card">
              <h2>Account Settings</h2>
              <div className="settings-field">
                <label>Your Motto</label>
                <input type="text" value={settingsData.motto} onChange={(e) => setSettingsData({ ...settingsData, motto: e.target.value })} />
              </div>
              <div className="settings-field">
                <label>New Password</label>
                <input type="password" value={settingsData.password} onChange={(e) => setSettingsData({ ...settingsData, password: e.target.value })} />
              </div>
              <button className="post-button" onClick={handleUpdateSettings}>Save Changes</button>
              <div className="settings-field profile-upload-section" style={{ marginTop: '20px' }}>
                <label>Update Profile Picture</label>
                {user.profile_pic_url && !selectedFile && (
                  <div className="avatar-preview">
                    <img
                      src={`${API_BASE_URL}${user.profile_pic_url}`}
                      alt="current"
                      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  </div>
                )}
                <input type="file" onChange={(e) => setProfileFile(e.target.files[0])} />
                {profileFile && (
                  <div className="avatar-preview">
                    <img
                      src={URL.createObjectURL(profileFile)}
                      alt="preview"
                      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  </div>
                )}
                <button type="button" className="upload-btn" onClick={handleProfilePicUpload}>Upload</button>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS VIEW */}
        {activeTab === 'notifications' && (
          <div className="notifications-container">
            <h4>Notifications will show here when they load</h4>
            <p>No recent notifications</p>
            <div className="notifications-list">
              {notifications.map(n => (
                <div key={n.id} className={`notif-card ${n.is_read ? '' : 'unread'}`}>
                  {n.type === 'message' ? (
                    <p><strong>{n.actorName}</strong> sent you a message.</p>
                  ) : (
                    <p><strong>{n.actorName}</strong> {n.type} on your post.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

        <button className="hamburger-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
        <div className={`bar ${isMenuOpen ? 'animate' : ''}`}></div>
        <div className={`bar ${isMenuOpen ? 'animate' : ''}`}></div>
        <div className={`bar ${isMenuOpen ? 'animate' : ''}`}></div>
      </button>

{/* FLOATING ACTION BUTTON (MOBILE CHAT) */}
<button 
  className="mobile-chat-fab" 
  onClick={(e) => {
    e.stopPropagation(); // Prevents event bubbling
    setIsChatOpen(prev => !prev);
  }}
>
  <span>{isChatOpen ? "Close Chat" : "Open Chat"}</span>
  {totalUnreadCount > 0 && !isChatOpen && (
    <span className="mobile-fab-badge">{totalUnreadCount}</span>
  )}
</button>

{/* MOBILE CHAT CONTAINER */}
{/* MOBILE CHAT CONTAINER */}
<div className={`chat-container ${isChatOpen ? 'mobile-open' : ''}`}>
  
  {/* TOP BAR / HEADER */}
  <div className="mobile-chat-header">
    {activeChatUser ? (
      <>
        {/* Back button to return to conversations list */}
        <button className="back-btn" onClick={() => setActiveChatUser(null)}>
          ← Back
        </button>
        <span className="active-user-title">{activeChatUser.name}</span>
      </>
    ) : (
      <h3>Messages</h3>
    )}

    {/* Close button to hide the panel */}
    <button className="close-chat-btn" onClick={() => setIsChatOpen(false)}>
      ✕
    </button>
  </div>

  {/* DYNAMIC BODY CONTENT */}
  <div className="mobile-chat-body">
    {activeChatUser ? (
      <Chat 
        currentUser={user} 
        receiver={activeChatUser} 
      />
    ) : (
      <ConversationsList 
        currentUserId={user?.id} 
        onSelectUser={(selectedUser) => {
          setActiveChatUser(selectedUser); /* 👈 Opens the chat panel for this specific user */
        }} 
      />
    )}
  </div>
</div>

{showPostFab && (
  <button className="mobile-post-fab" onClick={() => {
    const topElem = document.querySelector('.create-post-container');
    if (topElem) topElem.scrollIntoView({ behavior: 'smooth' });
  }}>
    +
  </button>
)}

{/* CHAT PANEL - remove inline conversations list (keeps Chat component) */}
<aside className={`chat-panel ${isChatOpen ? 'open' : 'hidden'}`}>
  
  {/* compact chat header - user and quick actions */}
  <div className="chat-panel-header">
    <strong>Chat</strong>
    <div className="chat-panel-actions">
      <button className="refresh-btn" onClick={fetchConversations} title="Refresh">⟳</button>
      <button className="open-convos" onClick={() => setConvoModalOpen(true)}>Conversations</button>
    </div>
  </div>


  {activeChatUser ? (
    <Chat currentUser={user} receiver={activeChatUser} />
  ) : (
    <ConversationsList
      currentUserId={user?.id}
      onSelectUser={(selectedUser) => {
        setActiveChatUser(selectedUser);
        setIsChatOpen(true);
      }}
    />
  )}
</aside>

{/* Media Modal Overlay */}
{showMediaModal && selectedMediaPost && (
  <div className="media-modal-overlay" onClick={() => setShowMediaModal(false)}>
    <div className="media-modal-content" onClick={(e) => e.stopPropagation()}>
      <button className="modal-close-btn" onClick={() => setShowMediaModal(false)}>✕</button>
      
      <div className="modal-media-container">
        {selectedMediaPost.media_type === 'video' ? (
          <video controls className="modal-media">
            <source src={`${API_BASE_URL}${selectedMediaPost.media_url}`} type="video/mp4" />
          </video>
        ) : (
          <img src={`${API_BASE_URL}${selectedMediaPost.media_url}`} alt="post" className="modal-media" />
        )}
      </div>
      
      <div className="modal-post-details">
        <div className="modal-post-header">
          <div className="post-avatar" style={{ backgroundColor: getAvatarColor(selectedMediaPost.author) }}>
            {selectedMediaPost.author.charAt(0).toUpperCase()}
          </div>
          <div className="post-info">
            <strong>{selectedMediaPost.author}</strong>
            <span className="post-time">• {formatTimeAgo(selectedMediaPost.created_at)}</span>
          </div>
        </div>
        <p className="modal-post-content">{selectedMediaPost.content}</p>
        
        <div className="modal-interactions">
          <button
            className={`interaction-btn like-btn ${likedPosts.has(selectedMediaPost.id) ? 'liked' : ''}`}
            onClick={
              async () => {
              setLikedPosts(prev => {
                const newSet = new Set(prev);
                if (newSet.has(selectedMediaPost.id)) {
                  newSet.delete(selectedMediaPost.id);
                } else {
                  newSet.add(selectedMediaPost.id);
                }
                return newSet;
              });
              // API call for like
              await fetch(`${API_BASE_URL}/api/posts/${selectedMediaPost.id}/like`, { method: 'POST' });
            }}
          >
            {likedPosts.has(selectedMediaPost.id) ? '❤️' : '🤍'} {likedPosts.has(selectedMediaPost.id) ? 'Liked' : 'Like'}
          </button>
        </div>
        
        {/* Comments in Modal */}
        <div className="facebook-comments-section">
          {comments[selectedMediaPost.id] && comments[selectedMediaPost.id].length > 0 && (
            <div className="comments-list">
              {comments[selectedMediaPost.id].map((comment, idx) => (
                <div key={idx} className="facebook-comment-item">
                  <div className="comment-avatar">
                    {comment.userName ? comment.userName.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="comment-content">
                    <strong>{comment.userName}</strong>
                    <p>{comment.text}</p>
                    {comment.userName === user.name && (
                      <button
                        className="comment-delete-btn"
                        onClick={() => handleDeleteComment(selectedMediaPost.id, comment.id)}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="facebook-comment-input">
            <div className="comment-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : '?'}
            </div>
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentDrafts[selectedMediaPost.id] || ''}
              onChange={(e) => setCommentDrafts(prev => ({ ...prev, [selectedMediaPost.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendComment(selectedMediaPost.id);
                }
              }}
            />
            <button
              type="button"
              className="comment-send-btn"
              onClick={() => handleSendComment(selectedMediaPost.id)}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default Dashboard;