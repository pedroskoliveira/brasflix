import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

async function ensureDir(dir) {
  try {
    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) {
      throw new Error(`Já existe um arquivo com o nome da pasta esperada: ${dir}`);
    }
    return;
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.mkdir(dir, { recursive: true });
      return;
    }
    throw error;
  }
}

async function removeIfFile(targetPath) {
  try {
    const stat = await fs.stat(targetPath);
    if (stat.isFile()) {
      await fs.unlink(targetPath);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function copyRecursive(src, dest) {
  const stat = await fs.stat(src);

  if (stat.isDirectory()) {
    await removeIfFile(dest);
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
  const sourceModels = path.join(projectRoot, "models");
  const publicDir = path.join(projectRoot, "public");
  const targetModels = path.join(publicDir, "models");

  await ensureDir(publicDir);

  const assetsToCopy = [
    { from: sourceModels, to: targetModels }
  ];

  for (const asset of assetsToCopy) {
    try {
      await copyRecursive(asset.from, asset.to);
      console.log(
        `[prepare-static] Copiado: ${path.relative(projectRoot, asset.from)} -> ${path.relative(projectRoot, asset.to)}`
      );
    } catch (error) {
      console.error(
        `[prepare-static] Falha ao copiar ${asset.from}:`,
        error.message
      );
      process.exitCode = 1;
    }
  }
}

main();
