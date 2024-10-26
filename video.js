const { globSync } = require("glob");
const { bundle } = require("@remotion/bundler");
const {
  renderMedia,
  selectComposition,
  openBrowser,
} = require("@remotion/renderer");
// const { getAudioDurationInSeconds } = require("@remotion/media-utils");
const { getAudioDurationInSeconds } = require("get-audio-duration");
const path = require("path");
const express = require("express");
const cors = require("cors");

const dir = "common-rte";
const name = "useMultiPageRTE";

const PORT = 4004;

function setupServer(audioFiles, imageFiles) {
  const app = express();

  // Enable CORS
  app.use(cors());

  // Add proper headers
  app.use((req, res, next) => {
    res.header("Cross-Origin-Resource-Policy", "cross-origin");
    res.header("Cross-Origin-Embedder-Policy", "require-corp");
    res.header("Cross-Origin-Opener-Policy", "same-origin");
    next();
  });

  // Create a virtual directory for our media files
  app.use("/media", (req, res, next) => {
    const fileName = req.url.replace(/^\//, "");
    const file = [...audioFiles, ...imageFiles].find(
      (f) => path.basename(f) === fileName
    );

    if (file) {
      // Set content type based on file extension
      const ext = path.extname(file).toLowerCase();
      const contentType =
        ext === ".png"
          ? "image/png"
          : ext === ".mp3"
          ? "audio/mpeg"
          : "application/octet-stream";

      res.set({
        "Content-Type": contentType,
        "Cross-Origin-Resource-Policy": "cross-origin",
      });

      // Use absolute path with sendFile
      const absolutePath = path.resolve(file);
      res.sendFile(absolutePath, {
        headers: {
          "Cross-Origin-Resource-Policy": "cross-origin",
        },
      });
    } else {
      console.log("File not found:", fileName);
      console.log(
        "Available files:",
        [...audioFiles, ...imageFiles].map((f) => path.basename(f))
      );
      next();
    }
  });

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`Media server running on port ${PORT}`);
      // Log available endpoints
      console.log("Available media files:");
      [...audioFiles, ...imageFiles].forEach((file) => {
        console.log(`http://localhost:${PORT}/media/${path.basename(file)}`);
      });
      resolve(server);
    });
  });
}

async function getAudioDurations(audioFiles) {
  console.log("Calculating audio durations...");
  const durations = await Promise.all(
    audioFiles.map(async (file) => {
      const durationInSeconds = await getAudioDurationInSeconds(file);
      console.log(`${path.basename(file)}: ${durationInSeconds.toFixed(2)}s`);
      return Math.ceil(durationInSeconds * 30); // Convert to frames (30fps)
    })
  );
  return durations;
}

async function createVideo() {
  try {
    console.log("Starting video creation process...");

    // Use absolute paths
    const audioFiles = globSync(`./generated/${dir}/${name}_script_*.mp3`)
      .map((f) => path.resolve(process.cwd(), f))
      .sort((a, b) => {
        return (
          parseInt(a.match(/script_(\d+)/)[1]) -
          parseInt(b.match(/script_(\d+)/)[1])
        );
      });

    const imageFiles = globSync(`./generated/${dir}/${name}_snippet_*.png`)
      .map((f) => path.resolve(process.cwd(), f))
      .sort((a, b) => {
        return (
          parseInt(a.match(/snippet_(\d+)/)[1]) -
          parseInt(b.match(/snippet_(\d+)/)[1])
        );
      });

    console.log(
      `Found ${audioFiles.length} audio files and ${imageFiles.length} image files`
    );

    if (!audioFiles.length || !imageFiles.length) {
      throw new Error("No audio or image files found");
    }

    // Start the media server
    server = await setupServer(audioFiles, imageFiles);

    // Convert file paths to URLs
    const audioUrls = audioFiles.map(
      (f) => `http://localhost:${PORT}/media/${path.basename(f)}`
    );
    const imageUrls = imageFiles.map(
      (f) => `http://localhost:${PORT}/media/${path.basename(f)}`
    );

    // Get actual durations of audio files
    const audioDurations = await getAudioDurations(audioFiles);
    const totalDurationInFrames = audioDurations.reduce((a, b) => a + b, 0);

    console.log("\nStarting render with configuration:");
    console.log(
      `- Total Duration: ${totalDurationInFrames} frames (${(
        totalDurationInFrames / 30
      ).toFixed(1)}s)`
    );
    // console.log("- Individual clip durations:");
    // audioDurations.forEach((frames, i) => {
    //   console.log(`  Clip ${i + 1}: ${(frames / 30).toFixed(1)}s`);
    // });
    console.log(`- FPS: 30`);
    console.log(`- Dimensions: 1920x1080`);
    console.log(
      `- Estimated duration: ${Math.round(
        totalDurationInFrames / 30 / 60
      )} minutes\n`
    );

    console.log("Bundling Remotion composition...");
    const bundled = await bundle(
      path.join(process.cwd(), "./remotion/index.js")
    );

    // Get the composition details
    const composition = await selectComposition({
      serveUrl: bundled,
      id: "SlideShow",
      height: 1080,
      width: 1920,
      inputProps: {
        audioFiles: audioUrls, // Use URLs instead of file paths
        imageFiles: imageUrls, // Use URLs instead of file paths
        audioDurations, // Pass the durations to the composition
      },
    });

    console.log("\nStarting render with configuration:");
    console.log(`- Duration: ${composition.durationInFrames} frames`);
    console.log(`- FPS: ${composition.fps}`);
    console.log(`- Dimensions: ${composition.width}x${composition.height}`);
    console.log(
      `- Estimated duration: ${Math.round(
        composition.durationInFrames / composition.fps / 60
      )} minutes\n`
    );

    let startTime = Date.now();
    let lastLogTime = startTime;
    let renderedFrames = 0;

    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: "h264",
      outputLocation: `C:/Users/alext/projects/common/codecapture/${name}_final_video.mp4`,
      inputProps: {
        audioFiles: audioUrls, // Use URLs instead of file paths
        imageFiles: imageUrls, // Use URLs instead of file paths
        audioDurations, // Pass the durations to the composition
      },
      durationInFrames: totalDurationInFrames,
      fps: 30,
      height: 1080,
      width: 1920,
      onProgress: (progress) => {
        renderedFrames = progress.renderedFrames;
        const currentTime = Date.now();

        // Only log every 5 seconds to avoid console spam
        if (currentTime - lastLogTime > 5000) {
          const elapsedSeconds = (currentTime - startTime) / 1000;
          const estimatedTotalSeconds = elapsedSeconds / progress.progress;
          const remainingMinutes = Math.round(
            (estimatedTotalSeconds - elapsedSeconds) / 60
          );

          // Calculate render speed (frames per second)
          const fps = Math.round((renderedFrames / elapsedSeconds) * 10) / 10;

          console.log(`Progress: ${(progress.progress * 100).toFixed(1)}%`);
          console.log(`Rendered ${renderedFrames} frames at ${fps} fps`);
          console.log(`Estimated time remaining: ${remainingMinutes} minutes`);
          console.log("----------------------------------------\n");

          lastLogTime = currentTime;
        }
      },
      onStart: () => {
        console.log("Render started...\n");
      },
    });

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    const averageFps = Math.round((renderedFrames / totalTime) * 10) / 10;

    console.log("\nRender completed!");
    console.log(
      `Total time: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`
    );
    console.log(`Average render speed: ${averageFps} fps`);
    console.log(`Output saved to: ${name}_final_video.mp4`);
  } catch (err) {
    console.error("Error:", err);
  }
}

// Run the renderer
console.log("Initializing video creation...");
createVideo();
