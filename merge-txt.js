const fs = require("fs");
const { glob } = require("glob");

// Replace these with your values
const dir = "common-rte";
const name = "useMultiPageRTE";
const outputFile = "combined_output.txt";

console.info("start glob");

// Need to wrap in async function since glob returns a promise
async function combineFiles() {
  try {
    const files = await glob(`./generated/${dir}/${name}_script_*.txt`);

    // Sort files numerically
    files.sort((a, b) => {
      const numA = parseInt(a.match(/script_(\d+)/)[1]);
      const numB = parseInt(b.match(/script_(\d+)/)[1]);
      return numA - numB;
    });

    // Clear output file first
    fs.writeFileSync(outputFile, "");

    // Process each file
    files.forEach((file) => {
      const content = fs.readFileSync(file, "utf8");
      fs.appendFileSync(outputFile, content + "\n\n");
      console.log(`Added ${file}`);
    });

    console.log(`Combined ${files.length} files into ${outputFile}`);
  } catch (err) {
    console.error("Error:", err);
  }
}

// Call the function
combineFiles();
