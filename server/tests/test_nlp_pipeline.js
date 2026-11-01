const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { classifyUserIntent, generateAndUploadImage, isImagePrompt } = require("../services/imageGen");

async function runTests() {
  console.log("🚀 Starting Nebula AI NLP & ML Pipeline Tests...\n");

  const testPrompts = [
    { input: "pls generte car image", expectedImage: true, desc: "Typo in 'generate'" },
    { input: "pls generate the mohanlal image", expectedImage: true, desc: "Real celebrity prompt" },
    { input: "drw a cypbpunk cr in nyt", expectedImage: true, desc: "Extreme typos ('drw', 'cypbpunk', 'cr', 'nyt')" },
    { input: "who is the chief minister of kerala", expectedImage: false, desc: "Factual query (should NOT generate image)" },
    { input: "orupadam mammootty", expectedImage: true, desc: "Manglish phrase ('orupadam' = a picture)" },
  ];

  let passed = 0;
  for (const t of testPrompts) {
    const isCandidate = isImagePrompt(t.input);
    const intent = await classifyUserIntent(t.input);
    const ok = intent.isImage === t.expectedImage;
    if (ok) passed++;

    console.log(`Test: "${t.input}" (${t.desc})`);
    console.log(`  -> isCandidate: ${isCandidate}`);
    console.log(`  -> Intent isImage: ${intent.isImage} (Expected: ${t.expectedImage})`);
    console.log(`  -> cleanSubject: "${intent.cleanSubject}"`);
    console.log(`  -> isRealEntity: ${intent.isRealEntity}`);
    console.log(`  -> Result: ${ok ? "✅ PASS" : "❌ FAIL"}\n`);
  }

  console.log(`\nTesting Image Generation & Cloudinary CDN Upload for "Mohanlal"...`);
  const mohanlalIntent = await classifyUserIntent("pls generate the mohanlal image");
  const mohanlalResult = await generateAndUploadImage(mohanlalIntent);
  console.log("Mohanlal result URL:", mohanlalResult.cdnUrl);
  if (mohanlalResult.cdnUrl && mohanlalResult.cdnUrl.startsWith("http")) {
    console.log("✅ Mohanlal visual URL verified successfully!");
  } else {
    console.error("❌ Failed to get Mohanlal visual URL");
  }

  console.log(`\nTesting Image Generation & Cloudinary CDN Upload for "cyberpunk sports car"...`);
  const carIntent = await classifyUserIntent("pls generte car image");
  const carResult = await generateAndUploadImage(carIntent);
  console.log("Car result URL:", carResult.cdnUrl);
  if (carResult.cdnUrl && carResult.cdnUrl.startsWith("http")) {
    console.log("✅ Car visual URL verified successfully!");
  } else {
    console.error("❌ Failed to get Car visual URL");
  }

  console.log(`\nSummary: ${passed}/${testPrompts.length} NLP intent tests passed.`);
}

runTests().catch(console.error);

