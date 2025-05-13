const formatBotResponse = (response) => {
    const parts = response.split(/(```[\s\S]*?```)/g);
  
    return parts.map((part) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const code = part.slice(3, -3).trim();
        const languageMatch = code.match(/^\w+/);
        const language = languageMatch ? languageMatch[0] : "javascript";
  
        return `<pre><code class="language-${language}">${code}</code></pre>`;
      }
      return `<p>${part}</p>`;
    }).join("");
  }; 
  
  module.exports = { formatBotResponse };
  