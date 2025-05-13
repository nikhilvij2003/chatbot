const { google } = require("googleapis");
const User = require("../models/User");

const getOAuth2Client = (accessToken, refreshToken, userId) => {
  console.log("In getOauthclient------------ googlecalendar.js file")
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: 1,
  });
  oauth2Client.on("tokens", async (tokens) => {
    console.log("New tokens received:", tokens);
    if (!tokens.refresh_token) {
      try {
        await User.updateOne(
          { _id: userId },
          { $set: { refreshToken: tokens.refresh_token } }
        );
        console.log("Refresh token updated successfully for user", userId);
      } catch (error) {
        console.error("Error updating refresh token for user", userId, error);
      }
    }
  });
  return oauth2Client;
};

const listEvents = async (accessToken, refreshToken, userId) => {
  const oauth2Client = getOAuth2Client(accessToken, refreshToken, userId);
  console.log("Fetching events with accessToken:", accessToken, "and refreshToken:", refreshToken);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const res = await calendar.events.list({ calendarId: "primary" });
  console.log("Events fetched successfully:", res.data.items);
  return res.data.items;
};

const addEvent = async (accessToken, refreshToken, userId, eventDetails) => {
  console.log("Adding event with details:", eventDetails);
  const oauth2Client = getOAuth2Client(accessToken, refreshToken, userId);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: eventDetails,
  });
  console.log("Event added successfully:", res.data);
  return res.data;
};

const deleteEvent = async (accessToken, refreshToken, userId, eventId) => {
  console.log("Deleting event with ID:", eventId);
  const oauth2Client = getOAuth2Client(accessToken, refreshToken, userId);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  await calendar.events.delete({ calendarId: "primary", eventId });
  console.log("Event deleted successfully");
};

module.exports = { listEvents, addEvent, deleteEvent };

