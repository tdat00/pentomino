// @ts-check
// Self-test page of the browser runner: `?check=pass` and `?check=fail` end the check, `?check=hang` never does.
const check = new URLSearchParams(location.search).get('check') ?? '';
console.log(`CHECK-START ${check}`);
if (check === 'pass' || check === 'fail') {
  console.log(`CHECK-END ${check.toUpperCase()} 0 s ${check}`);
  document.documentElement.dataset.result = check;
}
