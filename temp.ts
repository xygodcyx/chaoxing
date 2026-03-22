function getCombinations(options: string[]) {
  const result: string[][] = [];

  function backtrack(start: number, path: string[]) {
    if (path.length > 0) {
      result.push([...path]);
    }

    for (let i = start; i < options.length; i++) {
      path.push(options[i]);
      backtrack(i + 1, path);
      path.pop();
    }
  }

  backtrack(0, []);
  return result;
}

const allPossibilities = getCombinations([
  '0',
  '1',
  '2',
  '3',
]);
console.log(`总共有 ${allPossibilities.length} 种可能`);
console.log(allPossibilities);
