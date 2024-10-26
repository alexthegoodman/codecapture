const { globSync } = require("glob");
const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI(); // Make sure you have OPENAI_API_KEY in your environment
const dir = "common-rte";
const name = "useMultiPageRTE";

async function generateSpeechForFile(filepath) {
  try {
    // Read the script content
    const content = fs.readFileSync(filepath, "utf8");

    // Create output filename - replace .txt with .mp3
    const outputFile = filepath.replace(".txt", ".mp3");

    // Generate speech
    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: "onyx",
      input: content,
    });

    // Save the audio file
    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(outputFile, buffer);

    console.log(`Generated audio for: ${filepath} -> ${outputFile}`);
  } catch (err) {
    console.error(`Error processing ${filepath}:`, err);
  }
}

async function generateAllSpeeches() {
  try {
    // Get all script files
    const files = globSync(`./generated/${dir}/${name}_script_*.txt`);

    // Sort files numerically
    files.sort((a, b) => {
      const numA = parseInt(a.match(/script_(\d+)/)[1]);
      const numB = parseInt(b.match(/script_(\d+)/)[1]);
      return numA - numB;
    });

    // Process each file sequentially to avoid rate limits
    for (const file of files) {
      await generateSpeechForFile(file);
      // Optional: Add a small delay between API calls if needed
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("All audio files generated!");
  } catch (err) {
    console.error("Error:", err);
  }
}

// Run the script
generateAllSpeeches();
