import * as fs from 'fs-extra';
import * as path from 'path';
import { AntigravityAdapter } from '../adapters/AntigravityAdapter';
import { Adapter, ImportMode } from '../core/types';

const adapters: Record<string, Adapter> = {
    antigravity: new AntigravityAdapter(),
};

export interface ImportOptions {
    target: string;
    mode: ImportMode;
    projectPath?: string;
}

export async function importCommand(skillPath: string, options: ImportOptions): Promise<void> {
    const { target, mode, projectPath } = options;
    const adapter = adapters[target.toLowerCase()];

    if (!adapter) {
        console.error(`错误: 不支持的目标工具 "${target}"`);
        console.error(`支持的工具: ${Object.keys(adapters).join(', ')}`);
        process.exit(1);
    }

    const absoluteSkillPath = path.resolve(skillPath);

    // 检查源路径是否存在
    if (!await fs.pathExists(absoluteSkillPath)) {
        console.error(`错误: 技能路径不存在 "${absoluteSkillPath}"`);
        process.exit(1);
    }

    // 检查源路径是否为目录
    const stat = await fs.stat(absoluteSkillPath);
    if (!stat.isDirectory()) {
        console.error(`错误: 技能路径必须是一个目录 "${absoluteSkillPath}"`);
        process.exit(1);
    }

    // 确定项目根目录
    let projectRoot: string;
    if (mode === 'local') {
        if (!projectPath) {
            console.error('错误: local 模式需要通过 -p/--project 指定项目路径');
            process.exit(1);
        }
        projectRoot = path.resolve(projectPath);
        if (!await fs.pathExists(projectRoot)) {
            console.error(`错误: 项目路径不存在 "${projectRoot}"`);
            process.exit(1);
        }
    } else {
        projectRoot = process.cwd(); // global 模式不需要 projectRoot，但传入当前目录
    }

    console.log(`正在将技能从 "${skillPath}" 导入到 ${adapter.name} (${mode} 模式)...`);
    console.log(`目标目录: ${adapter.getTargetDir(mode)}\n`);

    try {
        await adapter.import(absoluteSkillPath, projectRoot, mode);
    } catch (error) {
        console.error('导入失败:', error);
        process.exit(1);
    }
}
