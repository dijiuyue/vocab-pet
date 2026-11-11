# VocabPet 桌面宠物背单词（Windows）

## 截图
| 待机 | 新单词 | 悬停看词 |
|---|---|---|
| ![](screenshots/1-pet-idle.png) | ![](screenshots/2-pet-new-word.png) | ![](screenshots/3-hover-word.png) |

| 翻转看释义 | 后台 |
|---|---|
| ![](screenshots/4-flipped-meaning.png) | ![](screenshots/5-dashboard.png) |

## 运行
解压 `VocabPet-win32-x64.zip`，双击 `VocabPet.exe`。宠物出现在屏幕右下角，托盘区有紫色小图标。
首次运行若出现 SmartScreen「Windows 已保护你的电脑」，点「更多信息 → 仍要运行」（程序未签名）。

## 玩法
- 平时只显示小宠物，鼠标移上去 → 弹出单词；点击单词卡片或宠物 → 翻转显示中文释义/例句
- 气泡两侧 ‹ › 切换上一个 / 下一个单词
- 默认每 30 分钟自动换词，宠物头上出现 NEW 并闪烁提示
- 按住宠物拖动可移动位置（会记住）；右键宠物或托盘图标 → 菜单
- 托盘菜单：打开后台 / 导入词单 / 下一个单词 / 显示/隐藏宠物 / 退出；单击托盘图标 = 显示/隐藏，双击 = 打开后台
- 后台：每日浏览数、查看释义数、连续天数、累计、14/30 天趋势图、当前词单进度、今日单词；可改换词间隔、导入词单、清空进度

## 词单格式（.txt / .csv / .tsv，UTF-8）
```
abandon,v. 放弃；抛弃,/əˈbændən/,They had to abandon the car.
ability	n. 能力	/əˈbɪləti/
sun 太阳
```
第 1 列单词，第 2 列释义；第 3、4 列可选（`/.../` 或 `[...]` 识别为音标，其余为例句）。释义含英文逗号时用双引号括起来，或用 Tab 分隔。`#` 开头为注释，表头 `word,meaning` 自动跳过。Excel 导出请选「CSV UTF-8」。

数据保存在 `%APPDATA%\VocabPet\vocabpet-data.json`。

## 开发
```
npm install
npm start            # 运行
npm test             # 词单解析单元测试
npm run shots        # 截图自检（Linux 可用 xvfb-run）
npm run pack:win     # 打包 Windows x64 绿色版到 dist/
```
