const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { extractAndSaveMemories, getUserMemories } = require("../services/memory");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB for Memory Test.");

  const msg = "I am Abhinav SD, a Senior AI Architect building Nebula AI in Malayalam and English";
  console.log("Extracting facts from:", msg);

  await extractAndSaveMemories({
    userEmail: "test_architect@nebula.ai",
    userMessage: msg,
  });

  const { memories, contextString } = await getUserMemories({ userEmail: "test_architect@nebula.ai" });
  console.log(`\n✅ Saved Memories: ${memories.length}`);
  memories.forEach((m) => {
    console.log(`  - [${m.category}] ${m.key}: ${m.value}`);
  });
  console.log("\nContext String Injected to System Prompt:\n", contextString);

  await mongoose.disconnect();
}

run().catch(console.error);

