export const testPerf = (funcA: () => unknown, funcB: () => unknown, samples = 1000): void => {
  let time = process.hrtime();
  for (let i = 0; i < samples; i++) {
    funcA();
  }
  let diff = process.hrtime(time);
  console.log(`FuncA took ${diff[1] / 1000000}ms`);

  time = process.hrtime();
  for (let i = 0; i < samples; i++) {
    funcB();
  }
  diff = process.hrtime(time);
  console.log(`FuncB took ${diff[1] / 1000000}ms`);
};
