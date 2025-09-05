const fs = require("fs");
const path = require("path");

// 修改为你的目标文件夹路径
const folder = "./";

fs.readdirSync(folder).forEach(file => {
  if (file.toLowerCase().endsWith(".png")) {
    // 提取 "FPA-01" 这样的前缀
    const match = file.match(/^(FPA-\d+)/);
    if (match) {
      let baseName = match[1];
      let ext = path.extname(file);
      let newName = baseName + ext;
      let oldPath = path.join(folder, file);
      let newPath = path.join(folder, newName);

      // 如果有重名文件，加序号
      let counter = 2;
      while (fs.existsSync(newPath)) {
        newName = `${baseName}-${counter}${ext}`;
        newPath = path.join(folder, newName);
        counter++;
      }

      fs.renameSync(oldPath, newPath);
      console.log(`重命名: ${file} -> ${newName}`);
    }
  }
});