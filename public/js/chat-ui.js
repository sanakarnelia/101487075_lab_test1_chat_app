// chat-ui.js (CLIENT)

const socket = io();

const user = JSON.parse(localStorage.getItem("user") || "null");
const room = localStorage.getItem("room");

if (!user || !room) {
  window.location.href = "/login";
}

const username = (user.username || "").trim();


const roomNameEl = document.getElementById("roomName");
const membersEl = document.getElementById("members");
const messagesEl = document.getElementById("messages");
const typingEl = document.getElementById("typing");
const msgForm = document.getElementById("msgForm");
const msgInput = document.getElementById("msgInput");

roomNameEl.textContent = room;


function addBubble({ meta, text, isSystem = false }) {
  const wrap = document.createElement("div");
  wrap.className = "bubble" + (isSystem ? " system" : "");
  wrap.innerHTML = `
    <div class="meta">${meta}</div>
    <div class="text">${text}</div>
  `;
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderMembers(members) {
  membersEl.innerHTML = "";
  members.forEach((m) => {
    const li = document.createElement("li");
    li.textContent = m;
    membersEl.appendChild(li);
  });
}


socket.on("connect", () => {
  socket.emit("joinRoom", { username, room });
});

// Load old messages from DB  
fetch(`/api/room-messages?room=${encodeURIComponent(room)}`)
  .then((r) => r.json())
  .then((list) => {
    list.forEach((m) => {
      addBubble({
        meta: `${m.from_user}  ${m.date_sent}`,
        text: m.message
      });
    });
  })
  .catch(() => {});


let typingTimer = null;

msgInput.addEventListener("input", () => {
  socket.emit("typing");

  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit("stopTyping");
  }, 700);
});

msgInput.addEventListener("blur", () => {
  socket.emit("stopTyping");
});


msgForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = msgInput.value.trim();
  if (!message) return;

  socket.emit("groupMessage", { message });
  msgInput.value = "";
  socket.emit("stopTyping");
});


socket.on("groupMessage", (m) => {
  addBubble({
    meta: `${m.from_user}  ${m.date_sent}`,
    text: m.message
  });
});

socket.on("system", (text) => {
  addBubble({
    meta: "Chat App",
    text,
    isSystem: true
  });
});


socket.on("typing", (data) => {
  if (!data || !data.username) return;
  typingEl.textContent = `${data.username} is typing...`;
});

socket.on("stopTyping", () => {
  typingEl.textContent = "";
});


socket.on("members", (members) => {
  renderMembers(members);
});


document.getElementById("leaveBtn").onclick = () => {
  socket.emit("leaveRoom");
  localStorage.removeItem("room");
  window.location.href = "/rooms";
};

document.getElementById("logoutBtn").onclick = () => {
  socket.emit("leaveRoom");
  localStorage.removeItem("user");
  localStorage.removeItem("room");
  window.location.href = "/login";
};