// socket-io.js
const GroupMessage = require("./models/GroupMessage");

const PREDEFINED_ROOMS = ["devops", "cloud computing", "covid19", "sports", "nodeJS"];
const roomMembers = new Map(); 

function getMembers(room) {
  return Array.from(roomMembers.get(room) || []);
}
function addMember(room, username) {
  if (!roomMembers.has(room)) roomMembers.set(room, new Set());
  roomMembers.get(room).add(username);
}
function removeMember(room, username) {
  if (!roomMembers.has(room)) return;
  roomMembers.get(room).delete(username);
  if (roomMembers.get(room).size === 0) roomMembers.delete(room);
}


function formatDate() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  let hh = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  const hh2 = String(hh).padStart(2, "0");
  return `${mm}-${dd}-${yyyy} ${hh2}:${min} ${ampm}`;
}

module.exports = function initSocket(io) {
  io.on("connection", (socket) => {

    // join room
    socket.on("joinRoom", async ({ username, room }) => {
      if (!username || !room) return;
      if (!PREDEFINED_ROOMS.includes(room)) return;

      // leave old room
      if (socket.data.room) {
        const oldRoom = socket.data.room;
        socket.leave(oldRoom);

        removeMember(oldRoom, socket.data.username);
        io.to(oldRoom).emit("members", getMembers(oldRoom));
        socket.to(oldRoom).emit("system", `${socket.data.username} left the room.`);
      }

      socket.data.username = username;
      socket.data.room = room;

      socket.join(room);

      addMember(room, username);
      io.to(room).emit("members", getMembers(room));
      socket.to(room).emit("system", `${username} joined the room.`);
    });

    // leave room
    socket.on("leaveRoom", () => {
      const { username, room } = socket.data;
      if (!room || !username) return;

      socket.leave(room);

      removeMember(room, username);
      io.to(room).emit("members", getMembers(room));
      socket.to(room).emit("system", `${username} left the room.`);

      socket.data.room = null;
    });

    // typing
    socket.on("typing", () => {
      const { username, room } = socket.data;
      if (!room || !username) return;
      socket.to(room).emit("typing", { username });
    });

    socket.on("stopTyping", () => {
      const { room } = socket.data;
      if (!room) return;
      socket.to(room).emit("stopTyping");
    });

    // group message
    socket.on("groupMessage", async ({ message }) => {
      const { username, room } = socket.data;
      if (!username || !room || !message?.trim()) return;

      const payload = {
        from_user: username,
        room,
        message: message.trim(),
        date_sent: formatDate()
      };

      await GroupMessage.create(payload);
      io.to(room).emit("groupMessage", payload);
    });

    // disconnect
    socket.on("disconnect", () => {
      const { username, room } = socket.data;
      if (room && username) {
        removeMember(room, username);
        io.to(room).emit("members", getMembers(room));
        socket.to(room).emit("system", `${username} disconnected.`);
      }
    });

  });
};
