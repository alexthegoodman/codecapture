const fs = require("fs").promises;
const path = require("path");
const puppeteer = require("puppeteer");
const hljs = require("highlight.js");
const axios = require("axios");
require("dotenv").config();

const TARGET_SUBJECT = "A multi-page rich text editor for the web.";
const TARGET_FOLDER = "./generated/common-rte/";

async function parseCodeSnippets(filePath, minLines = 20, maxLines = 30) {
  const content = await fs.readFile(filePath, "utf8");
  const lines = content.split("\n");
  const snippets = [];
  let currentSnippet = [];
  let braceCount = 0;

  for (const line of lines) {
    currentSnippet.push(line);

    // Count opening braces
    braceCount += (line.match(/{/g) || []).length;

    // Check for closing brace at the end of the line
    if (line.trim().endsWith("}") || line.trim().endsWith("};")) {
      braceCount--;

      // If braces are balanced and we have at least minLines
      if (currentSnippet.length >= minLines) {
        snippets.push(currentSnippet.join("\n"));
        currentSnippet = [];
      }
    }

    // If we've reached maxLines, force a new snippet
    if (currentSnippet.length >= maxLines) {
      snippets.push(currentSnippet.join("\n"));
      currentSnippet = [];
      braceCount = 0; // Reset brace count
    }
  }

  // Add any remaining lines as the last snippet if it meets minLines
  if (currentSnippet.length >= minLines) {
    snippets.push(currentSnippet.join("\n"));
  }

  return snippets;
}

async function renderCodeToImage(code, filename) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const highlightedCode = hljs.highlightAuto(code).value;
  const html = `
        <html>
        <head>
            <style>
                body { background: white; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; }
                pre { 
                  margin: 0; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.4; 
                  width: fit-content; box-shadow: 0px 15px 15px 4px rgba(0, 0, 0, 0.12); border-radius: 15px; padding: 25px;
                }
                ${await fs.readFile(
                  require.resolve("highlight.js/styles/github.css"),
                  "utf8"
                )}
            </style>
        </head>
        <body>
            <pre><code>${highlightedCode}</code></pre>
        </body>
        </html>
    `;

  await page.setViewport({ width: 800, height: 800 });
  await page.setContent(html);
  await page.screenshot({
    path: TARGET_FOLDER + filename,
    omitBackground: true,
  });
  await browser.close();
}

async function generateScriptFromAI(code, conversationHistory) {
  console.info("generateScript");
  const messages = [
    {
      role: "system",
      content:
        "You are an expert programmer tasked with explaining code snippets. Provide concise, clear explanations that highlight the key concepts and functionality of the code. This code will be about: " +
        TARGET_SUBJECT,
    },
    ...conversationHistory,
    {
      role: "user",
      content: `Explain this code snippet concisely:\n\n${code}`,
    },
  ];

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini", // or "gpt-4" if you have access
      messages: messages,
      // max_tokens: 150,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  console.info("response", response);

  return response.data.choices[0].message.content.trim();
}

async function processFile(filePath) {
  const snippets = await parseCodeSnippets(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  let conversationHistory = [];

  for (let i = 0; i < snippets.length; i++) {
    const snippet = snippets[i];
    const imageFilename = `${baseName}_snippet_${i + 1}.png`;
    const scriptFilename = `${baseName}_script_${i + 1}.txt`;

    await renderCodeToImage(snippet, imageFilename);
    console.log(`Generated image: ${imageFilename}`);

    const script = await generateScriptFromAI(snippet, conversationHistory);
    await fs.writeFile(TARGET_FOLDER + scriptFilename, script);
    console.log(`Generated script: ${scriptFilename}`);

    // Add the current explanation to the conversation history
    conversationHistory.push(
      { role: "user", content: `Explain this code snippet:\n\n${snippet}` },
      { role: "assistant", content: script }
    );

    // Optionally, limit the conversation history to prevent it from growing too large
    if (conversationHistory.length > 10) {
      conversationHistory = conversationHistory.slice(-10);
    }
  }
}

// Usage
const filePath = process.argv[2];
if (!filePath) {
  console.error("Please provide a file path as an argument.");
  process.exit(1);
}

processFile(filePath).catch(console.error);
