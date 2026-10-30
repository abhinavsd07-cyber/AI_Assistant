const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("==========================================");
console.log("✨ Nebula AI Chat CLI (Type 'exit' to quit)");
console.log("==========================================\n");

function askPrompt() {
  rl.question("നിങ്ങൾ (You): ", async (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
      askPrompt();
      return;
    }

    if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
      console.log("\n👋 സംഭാഷണം അവസാനിപ്പിച്ചു. നന്ദി!");
      rl.close();
      return;
    }

    try {
      process.stdout.write("⏳ ചിന്തിക്കുന്നു (Thinking)... \r");

      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("\n✨ Nebula AI:\n" + data.reply + "\n");
      } else {
        console.log("\n❌ Error: " + (data.details || data.error) + "\n");
      }
    } catch (err) {
      console.log("\n❌ Server Connection Error: " + err.message);
      console.log("👉 സെർവർ റൺ ചെയ്യുന്നുണ്ടെന്ന് ഉറപ്പാക്കുക (npm run dev)\n");
    }

    askPrompt();
  });
}

askPrompt();
