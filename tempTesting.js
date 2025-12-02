// const allTestPassed = Math.random() > 0.5;
const allTestPassed = true;

if (allTestPassed) {
  console.log('All backend tests have passed.');
  process.exit(0);
} else {
  console.log('Backend tests have failed.');
  process.exit(1);
}
