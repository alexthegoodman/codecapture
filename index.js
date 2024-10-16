const fs = require("fs").promises;
const path = require("path");
const puppeteer = require("puppeteer");
const hljs = require("highlight.js");
const axios = require("axios");

async function parseCodeSnippets(filePath, minLines = 10, maxLines = 20) {
  const content = await fs.readFile(filePath, "utf8");
  const lines = content.split("\n");
  const snippets = [];
  let currentSnippet = [];
  let braceCount = 0;

  for (const line of lines) {
    // console.info("line", line);
    currentSnippet.push(line);
    braceCount +=
      (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;

    if (
      // (braceCount === 0 && currentSnippet.length > 1) ||
      (currentSnippet.length >= minLines && braceCount > 1) ||
      currentSnippet.length >= maxLines
    ) {
      snippets.push(currentSnippet.join("\n"));
      currentSnippet = [];
      braceCount = 0;
    }
  }

  if (currentSnippet.length > 0) {
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
                body { background: white; margin: 0; padding: 20px; }
                pre { margin: 0; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.4; }
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

  await page.setContent(html);
  await page.screenshot({ path: filename, omitBackground: true });
  await browser.close();
}

async function generateScriptFromAI(code) {
  // Replace with your actual AI API call
  const response = await axios.post(
    "https://api.openai.com/v1/engines/davinci-codex/completions",
    {
      prompt: `Explain this code concisely:\n${code}\n\nExplanation:`,
      max_tokens: 150,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices[0].text.trim();
}

async function processFile(filePath) {
  const snippets = await parseCodeSnippets(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));

  // console.info("snippets", snippets[0], snippets[1], snippets[2]);

  for (let i = 0; i < snippets.length; i++) {
    const snippet = snippets[i];
    const imageFilename = `${baseName}_snippet_${i + 1}.png`;
    const scriptFilename = `${baseName}_script_${i + 1}.txt`;

    await renderCodeToImage(snippet, imageFilename);
    console.log(`Generated image: ${imageFilename}`);

    // const script = await generateScriptFromAI(snippet);
    // await fs.writeFile(scriptFilename, script);
    // console.log(`Generated script: ${scriptFilename}`);
  }
}

// Usage
const filePath = process.argv[2];
if (!filePath) {
  console.error("Please provide a file path as an argument.");
  process.exit(1);
}

processFile(filePath).catch(console.error);
