// rename-cn-artboards.js
// 用法：
// 1) 先试运行：node rename-cn-artboards.js --dry-run
// 2) 实际重命名：node rename-cn-artboards.js

const fs = require("fs").promises;
const path = require("path");

// 匹配 "三位数字 + 代号 + 型号 + '_画板 1-01.png'"
// 示例：001FXBP-101_画板 1-01.png  => FXBP-101.png
//      021FXLT-201-A_画板 1-01.png => FXLT-201-A.png
const PATTERN = /^\d{3}([A-Z]{4}-\d{3}(?:-[A-Z0-9]+)?)_画板 1-01\.png$/;

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const absDir = path.resolve("./");
  const entries = await fs.readdir(absDir, { withFileTypes: true });

  let total = 0, renamed = 0, skipped = 0, conflicts = 0;

  for (const ent of entries) {
    if (!ent.isFile()) continue;
    total++;
    const oldName = ent.name;

    // 只处理 .png
    if (!oldName.toLowerCase().endsWith(".png")) {
      skipped++;
      continue;
    }

    const m = oldName.match(PATTERN);
    if (!m) {
      skipped++;
      continue;
    }

    const core = m[1]; 
    const newName = `${core}.png`;

    if (oldName === newName) {
      skipped++;
      continue;
    }

    const from = path.join(absDir, oldName);
    const to = path.join(absDir, newName);

    try {
      await fs.access(to);
      conflicts++;
      console.warn(`[冲突] ${oldName} -> ${newName} 已存在，跳过`);
      continue;
    } catch {
      // 不存在，继续
    }

    if (dryRun) {
      console.log(`[试运行] ${oldName} -> ${newName}`);
    } else {
      await fs.rename(from, to);
      console.log(`[已重命名] ${oldName} -> ${newName}`);
    }
    renamed++;
  }

  console.log(`\n统计：总=${total}，已重命名=${renamed}，跳过=${skipped}，冲突=${conflicts}${dryRun ? "（试运行）" : ""}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
