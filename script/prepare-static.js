import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyRecursive(src, dest) {
  const stat = await fs.stat(src);

  if (stat.isDirectory()) {
    await ensureDir(dest);
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await copyRecursive(srcPath, destPath);
      } else {
        await ensureDir(path.dirname(destPath));
        await fs.copyFile(srcPath, destPath);
      }
    }
    return;
  }

  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

async function main() {
  const assetsToCopy = [
    {
      from: path.join(projectRoot, "models"),
      to: path.join(projectRoot, "public", "models")
    }
  ];

  for (const asset of assetsToCopy) {
    try {
      await copyRecursive(asset.from, asset.to);
      console.log(
        `[prepare-static] Copiado: ${path.relative(projectRoot, asset.from)} -> ${path.relative(projectRoot, asset.to)}`
      );
    } catch (error) {
      console.error(`[prepare-static] Falha ao copiar ${asset.from}:`, error.message);
      process.exitCode = 1;
    }
  }
}

main();
