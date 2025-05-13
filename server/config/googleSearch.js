const axios = require('axios');

const searchWeb = async (query) => {
  try {
    const response = await axios.get(
      "https://www.googleapis.com/customsearch/v1",
      {
        params: {
          key: process.env.GOOGLE_SEARCH_API_KEY,
          cx: process.env.GOOGLE_CSE_ID,
          q: query,
          num: 5 // Number of results
        }
      }
    );
    return response.data.items || [];
  } catch (error) {
    console.error("Google Search Error:", error.message);
    throw error;
  }
};

module.exports = { searchWeb };