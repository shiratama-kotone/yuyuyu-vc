var express = require("express");
var app = express();
var http = require("http").createServer(app);
var io = require("socket.io")(http);

app.use(express.static("public"));

var rooms = {};

io.on("connection", socket => {

  socket.on("join-room", data => {
    var room = data.room;
    var name = data.name;

    socket.join(room);

    socket.room = room;
    socket.username = name;

    if(!rooms[room]) rooms[room] = [];

    rooms[room].push({
      id: socket.id,
      name: name
    });

    socket.emit("users", rooms[room]);

    socket.to(room).emit("user-joined", {
      id: socket.id,
      name: name
    });

    socket.to(room).emit("chat", {
      system: true,
      message: `${name} が参加しました`
    });
  });

  socket.on("signal", data => {
    io.to(data.to).emit("signal", {
      from: socket.id,
      signal: data.signal,
      name: socket.username
    });
  });

  socket.on("chat", msg => {
    io.to(socket.room).emit("chat", {
      name: socket.username,
      message: msg
    });
  });

  socket.on("disconnect", () => {

    if(!socket.room) return;

    rooms[socket.room] =
      rooms[socket.room].filter(u => u.id !== socket.id);

    socket.to(socket.room).emit("user-left", socket.id);

    socket.to(socket.room).emit("chat", {
      system: true,
      message: `${socket.username} が退出しました`
    });
  });

});

http.listen(process.env.PORT || 3000);
