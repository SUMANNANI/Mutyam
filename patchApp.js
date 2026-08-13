import fs from "fs";

let appContent = fs.readFileSync("src/app.js", "utf8");

if (!appContent.includes("initDailyGuess")) {
  appContent = `import { initDailyGuess } from "./services/dailyGuess.js";\n` + appContent;
  appContent = appContent.replace(
    /console\.log\(.*Ready! Logged in as.*\);/g,
    `$& \n    initDailyGuess(this.client);`
  );
  fs.writeFileSync("src/app.js", appContent);
  console.log("[+] app.js successfully patched with initDailyGuess!");
} else {
  console.log("[!] app.js already patched.");
}
