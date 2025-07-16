const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const Document = require("./models/Document");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/collab-docs", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Get a document by ID or create it
  socket.on("get-document", async (documentId) => {
    const document = await findOrCreateDocument(documentId);
    socket.join(documentId);
    socket.emit("load-document", document.data);

    // When user types
    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    // Save doc every few seconds
    socket.on("save-document", async (data) => {
      await Document.findByIdAndUpdate(documentId, { data });
    });
  });
});

// Helper to fetch or create a document
async function findOrCreateDocument(id) {
  if (!id) return;

  const doc = await Document.findById(id);
  if (doc) return doc;

  return await Document.create({ _id: id, data: "" });
}

// Start the server
server.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});

