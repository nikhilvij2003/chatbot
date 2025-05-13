const OpenAI = require("openai");
const Chat = require("../models/Chat");

require('dotenv').config();
console.log("in asssistant dfile")
console.log(process.env.OPENAI_API_KEY)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: { 
    "OpenAI-Beta": "assistants=v2" 
  }
});

//  Create a Thread
const createThread = async (userId) => {
  try {
    const existingThreads = await Chat.find({ userId });
    console.log("Existing threads for userId:", userId, existingThreads);
    
    const thread = await openai.beta.threads.create();
    await Chat.create({
      userId,
      threadId: thread.id,
      messages: []
    });
    return thread.id;
  } catch (error) {
    console.error(" Error creating thread:", error.message);
    throw error;
  }
};


const getMessage = async (threadId, userMessage, userToken) => {
  try {
    let botResponse = "";

    // Detect Calendar Commands
    if (userMessage.toLowerCase().includes("show my events")) {
      console.log("in show events code -----------------assistant.js")
      const response = await axios.get("http://localhost:5000/api/auth/calendar/events", {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      botResponse = response.data.length 
        ? response.data.map(event => `📅 ${event.summary} - ${event.start.dateTime} `).join("\n") 
        : "No upcoming events found.";

    } else if (userMessage.toLowerCase().includes("add event")) {

      const response = await axios.post("http://localhost:5000/api/auth/calendar/event", eventDetails, {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      botResponse = `✅ Event '${response.data.summary}' added successfully!`;

    } else if (userMessage.toLowerCase().includes("delete event")) {
      const eventId = userMessage.split(" ").pop();
      await axios.delete(`http://localhost:5000/api/auth/calendar/event/${eventId}`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      botResponse = "🗑 Event deleted successfully!";

    } else {
      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: userMessage
      });

      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: process.env.OPENAI_ASSISTANT_ID, 
      });

      let runStatus;
      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
        
        if (runStatus.status === "failed") {
          throw new Error(`Assistant failed: ${runStatus.last_error?.message}`);
        }
      } while (runStatus.status !== "completed");

      // Get assistant's response
      const messages = await openai.beta.threads.messages.list(threadId, {
        order: "desc",
        limit: 1
      });

      botResponse = messages.data[0].content[0].text.value;
    }

    return botResponse;
  } catch (error) {
    console.error("Error processing message:", error.message);
    throw error;
  }
};


module.exports = { createThread, getMessage, openai };
