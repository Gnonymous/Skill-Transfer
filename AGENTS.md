# AGENTS.md

This file provides guidance to ALL coding agent when working with code in this repository.

## 📖 项目简介

**Skill Transfer CLI (`st`)** 是一款 TypeScript 编写的命令行工具，用于跨环境、跨工具管理和共享 AI 编码技能（工作流、提示词、配置）。
核心目标是实现"一次编写，到处运行"的 AI 技能分发。

目前主要支持 **Google Antigravity** (Gemini) 适配器，支持 Global（全局用户配置）和 Local（项目级配置）两种导入模式。

## 🛠️ 常用开发命令

### 构建与运行

*   **安装依赖**: `npm install`
*   **构建项目**: `npm run build` (编译 TS -> JS)
*   **开发模式**: `npm run dev` (监听文件变化并自动编译)
*   **运行 CLI**: `node dist/bin/skill-transfer.js --help`
*   **运行 TUI**: `node dist/bin/skill-transfer.js interactive`

### 测试与检查

*   **测试**: 目前暂无自动化测试 (`npm test` 仅仅是占位符)。
*   **Lint**: 依赖 `tsc` 编译检查，尚未集成 ESLint。

## 🏗️ 代码架构

本项目遵循 **模块化 (Modular)** 和 **适配器 (Adapter)** 设计模式。

### 核心目录 (`src/`)

*   **`adapters/`**: **扩展核心**。
    *   定义了 `Adapter` 接口 (见 `core/types.ts`)。
    *   目前实现：`AntigravityAdapter.ts`。
    *   **扩展指南**: 若要支持 Claude Code 或 Cursor，请在此目录下新建 `ClaudeAdapter.ts` 等，并实现 `import`, `listInstalled` 等方法。
*   **`commands/`**: **CLI 命令层**。
    *   使用 `commander` 定义 `import` 等指令。
    *   负责解析参数并调用相应的 Adapter。
*   **`interactive/`**: **TUI 交互层**。
    *   使用 `@inquirer/prompts` 构建终端菜单。
    *   处理用户选择技能、目标环境的逻辑。
*   **`core/`**: **通用逻辑**。
    *   包含类型定义 (`types.ts`) 和通用工具函数。

### 关键概念

1.  **Skill (技能)** vs **Workflow (工作流)**:
    *   **Workflow**: 安装时 `SKILL.md` 会被重命名为 `<文件夹名>.md`，文件平铺到目标目录。
        *   Global: `~/.gemini/antigravity/global_workflows/`
        *   Local: `.agent/workflows/`
    *   **Skill**: 安装时整个文件夹原样复制，**不重命名**。
        *   Global: `~/.gemini/antigravity/global_skills/`
        *   Local: `.agent/skills/`
2.  **ResourceType**: 在导入时用户需选择资源类型 (`workflow` | `skill`)。
3.  **Transformation**: Adapter 根据 ResourceType 执行不同的安装逻辑。

### TUI 交互流程

1.  **选择工具** → 用户先选择目标适配器（如 Antigravity）。
2.  **扫描技能** → 根据所选工具扫描本地技能库，并显示 `[W|S]` 状态：
    *   `W` 绿色 = Workflow 已安装
    *   `S` 绿色 = Skill 已安装
3.  **选择技能** → 用户勾选要安装的技能。
4.  **选择资源类型** → 用户选择按 Workflow 还是 Skill 模式安装。
5.  **选择安装模式** → Global 或 Local。

## 📝 必须遵守的规则

1.  **Git 提交规范**:
    *   必须使用 **纯英文**。
    *   格式必须为 `type: subject`，简洁明了。
    *   **Examples**:
        *   `fea: add clauge code adapter`
        *   `fix: resolve path parsing error`
        *   `docs: update readme usage`
    *   **禁止**使用冗长的描述。

2.  **Git 操作原则**:
    *   **严禁** 擅自执行 `git push` 或其他可能有风险的操作。
    *   **必须** 在执行 Git 操作前询问用户并获得明确许可。

3.  **语言交互**:
    *   所有对用户的回复必须使用 **中文**。
