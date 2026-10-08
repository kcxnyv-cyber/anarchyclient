// Compile le TypeScript avec tsc, regroupe les fichiers dans l'ordre des dépendances
// puis insère le résultat dans src/index.html pour produire une page unique.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";

const ORDER = ["types", "dom", "fx", "data", "main"];
const OUTPUTS = process.argv.slice(2);

rmSync("out", { recursive: true, force: true });
execFileSync("tsc", ["-p", "tsconfig.json"], { stdio: "inherit" });

const code = ORDER.map((name) =>
  readFileSync(`out/${name}.js`, "utf8")
    .split("\n")
    .filter((line) => !/^import\s.+from\s+["'].+["'];?\s*$/.test(line) && !/^export\s*\{\s*\};?\s*$/.test(line))
    .map((line) => line.replace(/^export\s+/, ""))
    .join("\n"),
).join("\n");

const bundle = `(function () {\n"use strict";\n${code}\n})();`;
if (bundle.includes("</script")) throw new Error("Le bundle contient </script");

const html = readFileSync("src/index.html", "utf8").replace("/*__BUNDLE__*/", () => bundle);
mkdirSync("dist", { recursive: true });
for (const target of ["dist/index.html", ...OUTPUTS]) writeFileSync(target, html);
console.log(`OK : ${(html.length / 1024).toFixed(1)} Ko`);
