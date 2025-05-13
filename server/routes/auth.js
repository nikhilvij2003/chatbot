const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const { createThread, getMessage } = require("../config/assistant");
const { formatBotResponse } = require("../utils/formatResponse");
const authMiddleware = require("../middlewares/authMiddleware.js");
const Chat = require("../models/Chat");
const User = require("../models/User");
const { register, login } = require("../controllers/authController");
const { listEvents, addEvent, deleteEvent } = require("../config/googleCalendar.js");
const { searchWeb } = require("../config/googleSearch");
const { Readable } = require("stream");


const router = express.Router();


router.post("/register", register);
router.post("/login", login);




// ==========================
// Google OAuth Route
// ==========================
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email","https://www.googleapis.com/auth/calendar"], prompt: ["consent"], accessType:["offline"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      // Generate JWT token using JWT_SECRET
      const token = jwt.sign(
        { id: req.user._id, email: req.user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // Redirect to frontend with token and ID
      res.redirect(
        `https://omni-beta-teal.vercel.app/chat?token=${token}&id=${req.user._id}`
      );
    } catch (error) {
      //console.error("Google login error:", error);
      res.status(500).json({ message: "Internal server error", error: error.message || "An unexpected error occurred." });
    }
  }
);

// ==========================
// Get User Data (Protected Route)
// ==========================
router.get("/user", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user", error: error.message || "An unexpected error occurred." });
  }
});

// ==========================
// Start Chat Session (Create Thread)
// ==========================
// router.post("/start-chat", authMiddleware, async (req, res) => {
//   try {
//     // Check if a thread already exists for the user
//     let chat = await Chat.findOne({ userId: req.user.id });

//     if (!chat) {
//       // Create a new thread if not found
//       const threadId = await createThread(userId);
//       chat = new Chat({
//         userId: req.user.id,
//         threadId,
//         userMessage: "Chat initialized", // Initial message (optional)
//         botResponse: "Welcome! How can I help you today?"
//       });
//       await chat.save();
//     }


//     res.status(200).json({ message: "Chat session started", threadId: chat.threadId });
//     console.log("Chat session started");
//   } catch (error) {
//     console.error("Error starting chat session:", error);
//     res.status(500).json({ message: "Failed to start chat session" });
//   }
// });
// Modified start-chat route
router.post("/start-chat", authMiddleware, async (req, res) => {
  try {
    if (req.body.newThread) {
      // Create new thread
      const threadId = await createThread(req.user.id);
      const newChat = new Chat({
        userId: req.user.id,
        threadId,
        messages: [] // Initialize empty messages array
      });
      await newChat.save();
      return res.json({ threadId });
    }

    // Find latest thread if not creating new
    let chat = await Chat.findOne({ userId: req.user.id })
      .sort({ createdAt: -1 });
    
    if (!chat) {
      const threadId = await createThread(req.user.id);
      const newChat = new Chat({
        userId: req.user.id,
        threadId,
        messages: []
      });
      await newChat.save();
      return res.json({ threadId });
    }

    res.json({ threadId: chat.threadId });
  } catch (error) {
    console.error("Error starting chat session:", error);
    res.status(500).json({ message: "Failed to start chat session" });
  }
});


// ==========================
// Send Message and Get AI Response
// ==========================
router.post("/send-message", authMiddleware, async (req, res) => {
  try {
    const { message, threadId } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    // Find user’s existing thread
    let chat = await Chat.findOne({ userId: req.user.id, threadId });

    if (!chat) {
      return res.status(400).json({ message: "No active chat session found" });
    }
    if (message.toLowerCase().includes("show my events") ||
      message.toLowerCase().includes("add event") ||
      message.toLowerCase().includes("delete event")) {

      const user = await User.findById(req.user.id);
      if (!user.accessToken) {
        return res.json({ botResponse: "Please sign in with Google to use calendar features." });
      }

      const botResponse = await getMessage(chat.threadId, message, user.accessToken);
    }

    // Get AI response
    const botResponse = await getMessage(chat.threadId, message);

    // Format the AI response using regex
    const formattedResponse = formatBotResponse(botResponse);

    // Save message in MongoDB
    // await Chat.updateOne(
    //   { userId: req.user.id,threadId: chat.threadId },
    //   { 
    //     $push: { 
    //       messages: { 
    //         userMessage: message, 
    //         botResponse: formattedResponse,
    //         createdAt: new Date()
    //       } 
    const newChat = new Chat({
      userId: req.user.id,
      threadId: chat.threadId,
        userMessage: message,
        botResponse: botResponse
    });

    await newChat.save();
    

    // console.log("Incoming message:", message); // Log incoming message
    // console.log("Bot response:", formattedResponse); // Log bot response
    res.status(200).json({ botResponse: formattedResponse, threadId: chat.threadId });
  } catch (error) {
    //console.error("Error processing message:", error);
    res.status(500).json({ message: "Failed to process message" });
  }
});
// ==========================
// Logout Route
// ==========================
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.clearCookie("connect.sid"); // Remove session cookie
    res.status(200).json({ message: "Logged out successfully" });
  });
});


// ==========================
// Get Chat History
// ==========================
router.get("/get-history", authMiddleware, async (req, res) => {
  //console.log("In Get-History route---routes/auth")
  try {
    const chats = await Chat.find({ userId: req.user.id }).sort({
      timestamp: 1,
    });

    res.status(200).json(chats);
  } catch (error) {
    //console.error("Error fetching chat history:", error);
    res.status(500).json({ message: "Failed to fetch chat history" });
  }
});


router.get("/threads", authMiddleware, async (req, res) => {
  try {
    const threads = await Chat.aggregate([
      { $match: { userId: req.user.id } },
      { $unwind: "$messages" },
      { $sort: { "messages.timestamp": -1 } },
      {
        $group: {
          _id: "$threadId",
          lastMsg: { $first: "$messages" }
        }
      },
      { $sort: { "lastMsg.timestamp": -1 } }
    ]);

    const result = threads.map(t => ({
      threadId: t._id,
      lastMessage: {
        userMessage: t.lastMsg.userMessage,
        timestamp:   t.lastMsg.timestamp
      }
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch threads" });
  }
});


// ==========================
// Switch Thread Route
// ==========================
router.get("/thread/:threadId", authMiddleware, async (req, res) => {
  try {
    const threadExists = await Chat.exists({ 
      threadId: req.params.threadId, 
      userId: req.user.id 
    });
    
    if (!threadExists) {
      return res.status(404).json({ message: "Thread not found" });
    }
    
    res.json({ threadId: req.params.threadId });
  } catch (error) {
    res.status(500).json({ message: "Failed to switch thread" });
  }
});



router.get("/calendar/events", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    //console.log("user id is:", user);
    const events = await listEvents(user.accessToken, user.refreshToken, user._id);
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch events", error });
  }
  
});

router.post("/calendar/event", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const event = await addEvent(user.accessToken, user.refreshToken, user._id, req.body);
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: "Failed to add event" });
  }
});

router.delete("/calendar/event/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    await deleteEvent(user.accessToken, user.refreshToken, user._id, req.params.id);
    res.json({ message: "Event deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete event" });
  }
});



router.post("/search", authMiddleware, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ message: "Query is required" });

    const results = await searchWeb(query);
    const formattedResults = results.map(result => ({
      title: result.title,
      snippet: result.snippet,
      link: result.link
    }));

    res.json({ results: formattedResults });
  } catch (error) {
    res.status(500).json({ message: "Search failed", error: error.message });
  }
});




/********************socket*********************** */
router.post("/stream-message", authMiddleware, async (req, res) => {
  try {
    const { message, threadId } = req.body;
    const token = req.headers.authorization?.split(" ")[1];
    //console.log("🛡 Token:", req.headers.authorization);

    if (!message || !threadId) {
      return res.status(400).json({ message: "Message and threadId are required" });
    }

    const payload = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant for developer who generates and remove the bugs related to html, css and javascript.Also for creating the wesbite you give user the html, css and js files ." },
        { role: "user", content: message },
      ],
      stream: true,
      temperature: 0.7,
    };

    let streamResponse;
    let retries = 3;
    while (retries > 0) {

      try {
        streamResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify(payload),
        });
        break; // Break if fetch is successful
      } catch (fetchError) {
        retries--;
        if (retries === 0) {
        //console.error("Fetch call failed:", fetchError.stack || fetchError.message || fetchError);
        return res.status(500).json({ message: "Fetch call to OpenAI failed", error: fetchError.message || fetchError });
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!streamResponse.ok) {
      const errorText = await streamResponse.text();
      //console.error("Streaming API Error:", errorText);
      return res.status(500).json({ message: "OpenAI streaming failed", error: errorText });
    }

    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder(" utf-8");
    let result = "";

    const io = require("../config/Socket").getIO();

    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      buffer += chunk;

      const lines = buffer.split("\n");
      buffer = "";

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line.startsWith("data:")) continue;

        let json = line.replace(/^data: /, "");
        if (json === "[DONE]") {
          // End of stream
          break;
        }

        // If this is the last line and it might be incomplete, buffer it for next read
        if (i === lines.length - 1 && !json.endsWith("}")) {
          buffer = line + "\n";
          break;
        }

        try {
          const parsed = JSON.parse(json);
          const textPart = parsed.choices?.[0]?.delta?.content;
          if (textPart) {
            result += textPart;

            // emit partial content
            io.to(threadId).emit("streamChunk", {
              threadId,
              partial: textPart,
            });
          }
        } catch (err) {
          //console.error("JSON parse error:", err.message);
        }
      }
    }
    const formattedResponse = formatBotResponse(result); 
    const newChat = new Chat({
      userId: req.user.id,
      threadId: threadId,
      userMessage: message,
      botResponse: result
    });
    await newChat.save();

    // Emit final message
    io.to(threadId).emit("botResponse", {
      threadId,
      botResponse: result,
    });

    return res.status(200).json({ message: "Streaming complete" });

  } catch (error) {
    //console.error("Streaming error:", error.stack || error.message || error);
    res.status(500).json({ message: "Streaming failed", error: error.message || error });
  }
});

module.exports = router;
