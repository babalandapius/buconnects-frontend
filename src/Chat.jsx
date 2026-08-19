import React, { useState, useEffect, useRef } from 'react';
import './Chat.css'; // Ensure CSS is imported
import API_BASE_URL from './apiConfig.js';

const Chat = ({ currentUser, receiver, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch real message history between currentUser & receiver
  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUser?.id || !receiver?.id) {
        setMessages([]);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/chats/messages/${currentUser.id}/${receiver.id}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(Array.isArray(data) ? data : []);
          scrollToBottom();
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error("Error loading message thread:", err);
        setMessages([]);
      }
    };

    fetchMessages();
  }, [currentUser?.id, receiver?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 2. Handle Text Send
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;

    const messageData = {
      sender_id: currentUser.id,
      receiver_id: receiver.id,
      message_text: newMessage.trim(),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/chats/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      if (res.ok) {
        const savedMessage = await res.json();
        setMessages(prev => [...prev, savedMessage]);
        setNewMessage('');
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // 3. Handle Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendVoiceNote(audioBlob);
        stream.getTracks().forEach(track => track.stop()); // Stop mic
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or unavailble:", err);
      alert("Could not access microphone for voice message.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null; // Prevent sending
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const sendVoiceNote = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, `voice-${Date.now()}.webm`);
  formData.append('sender_id', currentUser.id);
  formData.append('receiver_id', receiver.id);
  formData.append('sender_name', currentUser.name || '');
  formData.append('receiver_name', receiver.name || '');

  try {
    const res = await fetch(`${API_BASE_URL}/api/chats/upload-audio`, {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const savedAudioMsg = await res.json();
      setMessages(prev => [...prev, savedAudioMsg]);
    }
  } catch (err) {
    console.error("Failed to upload audio message:", err);
  }
};

  return (
    <div className="active-chat-thread">
      
      {/* CHAT MESSAGES BODY */}
      <div className="chat-messages-area">
        {messages.length === 0 ? (
          <div className="empty-chat-state">
            <p>No messages yet. Say hello to {receiver?.name}!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUser.id;
            return (
              <div key={msg.id || idx} className={`message-bubble-wrapper ${isMe ? 'outgoing' : 'incoming'}`}>
                <div className="message-bubble">
                  {msg.audio_url ? (
                    <audio controls src={`${API_BASE_URL}${msg.audio_url}`} />
                  ) : (
                    <p>{msg.message_text}</p>
                  )}
                  <span className="message-time">
                    {new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT CONTROL BAR */}
      <div className="chat-input-bar">
        {isRecording ? (
          <div className="recording-controls">
            <span className="recording-indicator">🔴 Recording ({recordingTime}s)</span>
            <button type="button" className="cancel-rec-btn" onClick={cancelRecording}>Cancel</button>
            <button type="button" className="stop-rec-btn" onClick={stopRecording}>Send Audio</button>
          </div>
        ) : (
          <form className="input-form" onSubmit={handleSendMessage}>
            {/* RECORD AUDIO BUTTON */}
            <button 
              type="button" 
              className="mic-btn" 
              onClick={startRecording}
              title="Record Voice Note"
            >
              🎙️
            </button>

            {/* TEXT INPUT */}
            <input 
              type="text" 
              placeholder="Type a message..." 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
            />

            {/* SEND BUTTON */}
            <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
              Send
            </button>
          </form>
        )}
      </div>

    </div>
  );
};

export default Chat;