# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-01-25

### Added
- **Workflow/Skill 区分**: 真正支持了 Skill（文件夹复制）和 Workflow（文件重命名）两种不同的安装模式。
- **状态显示升级**: TUI 列表现在可以同时显示 `[W|S]` 两种安装状态。
- **交互取消功能**: 在所有选择步骤中增加了 `Cancel/Exit` 选项。
- **CLI 参数**: `import` 命令增加了 `-r, --resource` 参数以手动指定资源类型。

### Changed
- **交互逻辑重构**: 调整了 TUI 流程顺序（先选工具，再扫描并显示该工具对应的安装状态）。

### Fixed
- 修复了图像资源在 README 中的相对路径问题。

## [1.0.0] - 2026-01-03

### Added
- Initial release of Skill Transfer CLI.
- Interactive mode for managing skills.
- Implemented Antigravity adapter for workflows.
- Skill scanner and configuration management.
