# Issue tracker: 本地 Markdown

本仓库的 issue 与 spec 以 Markdown 文件存放在 `.scratch/`。

## 约定

- 每个 feature 一个目录：`.scratch/<feature-slug>/`
- spec：`.scratch/<feature-slug>/spec.md`
- 实现 ticket：`.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 编号，一 ticket 一文件，不要合并成一个 tickets 文件
- Triage 状态写在每个 issue 文件靠上的 `Status:` 行（角色字符串见 `triage-labels.md`）
- 评论与对话历史追加到文件底部 `## Comments` 标题下

## 当技能说 "publish to the issue tracker"

在 `.scratch/<feature-slug>/` 下新建文件（目录不存在则创建）。

## 当技能说 "fetch the relevant ticket"

读取指定路径的文件。用户通常会直接给出路径或 issue 编号。

## Wayfinding 操作

供 `/wayfinder` 使用。**map** 是一个文件，每个 ticket 一个 **child** 文件。

- **Map**: `.scratch/<effort>/map.md`（Notes / Decisions-so-far / Fog 正文）。
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`，从 `01` 编号，正文写问题。`Type:` 行记录 ticket 类型（`research`/`prototype`/`grilling`/`task`）；`Status:` 行记录 `claimed`/`resolved`。
- **Blocking**: 靠上的 `Blocked by: NN, NN` 行。它列出的每个文件都 `resolved` 时，ticket 才 unblocked。
- **Frontier**: 扫描 `.scratch/<effort>/issues/`，找 open、unblocked、unclaimed 的文件；编号最小者优先。
- **Claim**: 开始工作前设 `Status: claimed` 并保存。
- **Resolve**: 在 `## Answer` 标题下追加答案，设 `Status: resolved`，再把上下文指针（gist + link）追加到 `map.md` 的 Decisions-so-far。
