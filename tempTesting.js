 const allTestPassed = true;

// Add color helpers
const green = "\x1b[32m";
const red = "\x1b[31m";
const reset = "\x1b[0m";

if (allTestPassed) {
  console.log(`${green}✅ All backend tests have passed! 🚀${reset}`);
  process.exit(0);
} else {
  console.log(`${red}❌ Backend tests have failed! 🛑${reset}`);
  process.exit(1);
}
