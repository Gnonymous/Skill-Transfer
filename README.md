# Skill Transfer CLI

CLI tool to transfer AI coding skills/configurations between different tools.

## Installation

```bash
npm install -g skill-transfer
```

## Usage

```bash
# 查看帮助
st --help
st import --help

# Global 模式 (默认)：导入到全局配置
st import <skill-path> -t antigravity

# Local 模式：导入到指定项目的配置
st import <skill-path> -t antigravity -m local -p <project-path>

# 示例
st import ./my-skills/code-review -t antigravity
st import ./my-skills/code-review -t antigravity -m local -p /path/to/my-project
```

## Rename Logic

导入时，源文件夹内的 `SKILL.md` 会自动重命名为 `<源文件夹名>.md`。其他文件保持名称不变。
  - Global: `~/.gemini/antigravity/global_workflows/`
  - Local: `<project>/.agent/workflows/`

## Development

```bash
# 安装依赖
npm install

# 构建
npm run build

# 本地测试
node dist/bin/skill-transfer.js --help
```

## License

ISC

