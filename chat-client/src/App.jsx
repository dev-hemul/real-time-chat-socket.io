import {useEffect, useState, useRef} from "react";
import {socket} from "./lib/socket";
import EmojiPicker from './lib/EmojiPicker';

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [room, setRoom] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    const savedUsername = localStorage.getItem("username");
    const savedRoom = localStorage.getItem("room");

    if (savedUsername && savedRoom) {
      setUsername(savedUsername);
      setRoom(savedRoom);
      setIsJoined(true);
      // Подключаемся и входим в комнату
      if (!socket.connected) {
        socket.connect();
        socket.once("connect", () => socket.emit("join:room", savedRoom));
      } else {
        socket.emit("join:room", savedRoom);
      }
    }
  }, []);

  useEffect(() => {
    socket.on("chat:history", (data) => {
      setMessages(data);
    });

    socket.on("chat:message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("chat:cleared", () => {
      setMessages([]);
    });

    return () => {
      socket.off("chat:history");
      socket.off("chat:message");
      socket.off("chat:cleared");
    };
  }, []);

  useEffect(() => {
    socket.on("typing:update", ({user, isTyping}) => {
      console.log("📥 typing:update received", {user, isTyping});
      setTypingUsers((prev) => {
        if (isTyping) {
          if (prev.includes(user)) return prev;
          return [...prev, user];
        } else {
          return prev.filter((u) => u !== user);
        }
      });
    });

    return () => {
      socket.off("typing:update");
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
  }, [messages, typingUsers]);

  const sendMessage = () => {
    if (!message.trim()) return;

    socket.emit("chat:message", {
      text: message,
      user: username,
      room,
      id: Date.now()
    });

    setMessage("");
  };

  if (!isJoined) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-white">

        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">

          {/* TITLE */}
          <h2 className="text-xl font-semibold mb-1">
            Join Chat
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Enter your name and room
          </p>

          {/* USERNAME */}
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your name"
            className="w-full mb-3 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 outline-none focus:border-blue-500 transition"
          />

          {/* ROOM */}
          <input
            placeholder="Room name"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="w-full mb-5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 outline-none focus:border-blue-500 transition"
          />

          {/* BUTTON */}
          <button
            onClick={() => {
              if (!username.trim() || !room.trim()) return;

              localStorage.setItem("username", username);
              localStorage.setItem("room", room);

              const connectAndJoin = () => {
                socket.emit("join:room", room);
                setIsJoined(true);
              };

              if (!socket.connected) {
                socket.connect();
                socket.once("connect", connectAndJoin);
              } else {
                connectAndJoin();
              }
            }}
            className="w-full py-2 bg-blue-600 rounded-xl hover:bg-blue-500 active:scale-95 transition font-medium"
          >
            Join Chat
          </button>

        </div>

      </div>
    );
  }

  const handleLeaveRoom = () => {
    localStorage.removeItem("room");

    socket.emit("leave:room", room);

    setMessages([]);
    setRoom("");
    setIsJoined(false);
  };

  const handleTyping = (e) => {
    const value = e.target.value;
    setMessage(value);

    if (!value.trim()) {
      socket.emit("typing:stop", {room, user: username});
      return;
    }

    // Отправляем только если предыдущего таймера нет или прошло > 300 мс
    if (!window.typingSent) {
      socket.emit("typing:start", {room, user: username});
      window.typingSent = true;
    }

    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      socket.emit("typing:stop", {room, user: username});
      window.typingSent = false;
    }, 800);
  };

  const onEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-950 text-white overflow-hidden">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-3 bg-slate-900 border-b border-slate-800 shadow-md">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold tracking-wide">Chat</h1>
          <div className="sm:hidden px-2 py-0.5 text-xs bg-slate-800 rounded-full">
            #{room}
          </div>
        </div>

        <div className="hidden sm:block px-3 py-1 text-xs bg-slate-800 rounded-full text-slate-300 border border-slate-700">
          #{room}
        </div>

        <div className="flex justify-between items-center gap-3">
          <button
            onClick={() => socket.emit("chat:clear", {room})}
            className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-500 rounded-full transition"
          >
            Clear chat
          </button>
          <button
            onClick={handleLeaveRoom}
            className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 rounded-full transition"
          >
            Leave
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-slate-700">

        {messages.map((msg) => (
          <div
            key={msg._id || msg.id}
            className={`flex items-end gap-2 max-w-[90%] sm:max-w-[75%] ${
              msg.user === username ? "self-end flex-row-reverse" : "self-start"
            }`}
          >

            {/* avatar */}
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${msg.user}`}
              className="w-7 h-7 rounded-full border border-slate-700"
            />

            {/* bubble */}
            <div
              className={`px-3 py-2 rounded-2xl text-sm shadow-md break-words ${
                msg.user === username
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-slate-800 text-slate-100 rounded-bl-md"
              }`}
            >
              <div className="text-[14px] sm:text-xs opacity-70 mb-1">
                {msg.user}
              </div>

              <div className="text-xl sm:text-lg leading-snug">
                {msg.text}
              </div>

              {/* time */}
              <div className="text-[11px] sm:text-[10px] opacity-40 mt-1 text-right">
                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString().slice(0, 5) : ""}
              </div>
            </div>

          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}

      {typingUsers.length > 0 && (
        <div className="px-4 pb-1 text-xs text-slate-400">
          {typingUsers.join(", ")} typing...
        </div>
      )}
      <div className="flex items-center gap-2 p-3 bg-slate-900 border-t border-slate-800">

        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="px-2 py-2 text-xl bg-slate-700 rounded-xl"
          >
            😊
          </button>
          {showEmojiPicker && <EmojiPicker width={400} height={450} onEmojiClick={onEmojiClick} />}
        </div>

        <input
          value={message}
          onChange={handleTyping}
          onKeyDown={(e) => {
            if (e.key === "Enter" && message.trim()) {
              sendMessage();
            }
          }}
          placeholder="Write a message..."
          className="flex-1 px-4 py-2 rounded-xl bg-slate-800 outline-none border border-slate-700 focus:border-blue-500 transition"
        />

        <button
          onClick={sendMessage}
          className="px-5 py-2 bg-blue-600 rounded-xl hover:bg-blue-500 active:scale-95 transition font-medium "
        >
          Send
        </button>

      </div>
    </div>
  );
}

export default App;