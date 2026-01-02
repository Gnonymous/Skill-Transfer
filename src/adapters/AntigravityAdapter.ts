import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { Adapter, ImportMode } from '../core/types';

export class AntigravityAdapter implements Adapter {
    readonly name = 'antigravity';

    getTargetDir(mode: ImportMode): string {
        if (mode === 'global') {
            return path.join(os.homedir(), '.gemini', 'antigravity', 'global_workflows');
        }
        return '.agent/workflows';
    }

    getGlobalDir(): string {
        return path.join(os.homedir(), '.gemini', 'antigravity', 'global_workflows');
    }

    async import(sourcePath: string, projectRoot: string, mode: ImportMode): Promise<void> {
        const absoluteSourcePath = path.resolve(sourcePath);

        let targetPath: string;
        if (mode === 'global') {
            targetPath = this.getTargetDir('global');
        } else {
            targetPath = path.join(projectRoot, this.getTargetDir('local'));
        }

        // 确保目标目录存在
        await fs.ensureDir(targetPath);

        // 获取源目录中的所有文件和子目录
        const items = await fs.readdir(absoluteSourcePath);

        const folderName = path.basename(absoluteSourcePath);
        for (const item of items) {
            const sourceItemPath = path.join(absoluteSourcePath, item);

            // 如果文件名是 SKILL.md，则重命名为文件夹名.md
            let targetItemName = item;
            if (item === 'SKILL.md') {
                targetItemName = `${folderName}.md`;
            }

            const targetItemPath = path.join(targetPath, targetItemName);

            // 复制文件或目录
            await fs.copy(sourceItemPath, targetItemPath, { overwrite: true });
            console.log(`  ✓ 已复制: ${item}${item !== targetItemName ? ` -> ${targetItemName}` : ''}`);
        }

        console.log(`\n导入完成! 文件已复制到 ${targetPath}/`);
    }

    /**
     * 列出 Global 目录中已安装的技能
     */
    async listInstalled(): Promise<string[]> {
        const globalDir = this.getGlobalDir();

        if (!await fs.pathExists(globalDir)) {
            return [];
        }

        const files = await fs.readdir(globalDir);
        // 技能文件以 .md 结尾，去掉扩展名作为技能名
        return files
            .filter(f => f.endsWith('.md'))
            .map(f => f.replace(/\.md$/, ''));
    }

    /**
     * 检查技能是否已在 Global 模式下安装
     */
    async isInstalled(skillName: string): Promise<boolean> {
        const skillPath = path.join(this.getGlobalDir(), `${skillName}.md`);
        return fs.pathExists(skillPath);
    }

    /**
     * 删除 Global 模式下已安装的技能
     */
    async deleteSkill(skillName: string): Promise<void> {
        const skillPath = path.join(this.getGlobalDir(), `${skillName}.md`);

        if (!await fs.pathExists(skillPath)) {
            throw new Error(`技能 "${skillName}" 未安装`);
        }

        await fs.remove(skillPath);
    }
}

