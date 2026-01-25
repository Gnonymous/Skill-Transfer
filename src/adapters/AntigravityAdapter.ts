import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { Adapter, ImportMode, ResourceType } from '../core/types';

export class AntigravityAdapter implements Adapter {
    readonly name = 'antigravity';

    getTargetDir(mode: ImportMode, resourceType: ResourceType): string {
        if (mode === 'global') {
            if (resourceType === 'workflow') {
                return path.join(os.homedir(), '.gemini', 'antigravity', 'global_workflows');
            } else {
                return path.join(os.homedir(), '.gemini', 'antigravity', 'global_skills');
            }
        }
        // local mode
        if (resourceType === 'workflow') {
            return '.agent/workflows';
        } else {
            return '.agent/skills';
        }
    }

    getGlobalDir(resourceType: ResourceType): string {
        if (resourceType === 'workflow') {
            return path.join(os.homedir(), '.gemini', 'antigravity', 'global_workflows');
        } else {
            return path.join(os.homedir(), '.gemini', 'antigravity', 'global_skills');
        }
    }

    async import(sourcePath: string, projectRoot: string, mode: ImportMode, resourceType: ResourceType): Promise<void> {
        const absoluteSourcePath = path.resolve(sourcePath);

        let targetPath: string;
        if (mode === 'global') {
            targetPath = this.getTargetDir('global', resourceType);
        } else {
            targetPath = path.join(projectRoot, this.getTargetDir('local', resourceType));
        }

        // 确保目标目录存在
        await fs.ensureDir(targetPath);

        const folderName = path.basename(absoluteSourcePath);

        if (resourceType === 'skill') {
            // Skill: 直接复制整个文件夹
            const targetFolderPath = path.join(targetPath, folderName);
            await fs.copy(absoluteSourcePath, targetFolderPath, { overwrite: true });
            console.log(`  ✓ 已复制文件夹: ${folderName}/`);
            console.log(`\n导入完成! 技能已复制到 ${targetFolderPath}/`);
        } else {
            // Workflow: 提取 SKILL.md 并重命名，平铺复制其他文件
            const items = await fs.readdir(absoluteSourcePath);

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

            console.log(`\n导入完成! 工作流已复制到 ${targetPath}/`);
        }
    }

    /**
     * 列出 Global 目录中已安装的资源
     */
    async listInstalled(resourceType: ResourceType): Promise<string[]> {
        const globalDir = this.getGlobalDir(resourceType);

        if (!await fs.pathExists(globalDir)) {
            return [];
        }

        const items = await fs.readdir(globalDir, { withFileTypes: true });

        if (resourceType === 'skill') {
            // Skill: 返回文件夹名
            return items
                .filter(item => item.isDirectory() && !item.name.startsWith('.'))
                .map(item => item.name);
        } else {
            // Workflow: 返回 .md 文件名（去掉扩展名）
            return items
                .filter(item => item.isFile() && item.name.endsWith('.md'))
                .map(item => item.name.replace(/\.md$/, ''));
        }
    }

    /**
     * 检查资源是否已在 Global 模式下安装
     */
    async isInstalled(resourceName: string, resourceType: ResourceType): Promise<boolean> {
        const globalDir = this.getGlobalDir(resourceType);

        if (resourceType === 'skill') {
            // Skill: 检查文件夹是否存在
            const skillPath = path.join(globalDir, resourceName);
            return fs.pathExists(skillPath);
        } else {
            // Workflow: 检查 .md 文件是否存在
            const workflowPath = path.join(globalDir, `${resourceName}.md`);
            return fs.pathExists(workflowPath);
        }
    }

    /**
     * 删除 Global 模式下已安装的资源
     */
    async deleteResource(resourceName: string, resourceType: ResourceType): Promise<void> {
        const globalDir = this.getGlobalDir(resourceType);

        let resourcePath: string;
        if (resourceType === 'skill') {
            resourcePath = path.join(globalDir, resourceName);
        } else {
            resourcePath = path.join(globalDir, `${resourceName}.md`);
        }

        if (!await fs.pathExists(resourcePath)) {
            const typeName = resourceType === 'skill' ? '技能' : '工作流';
            throw new Error(`${typeName} "${resourceName}" 未安装`);
        }

        await fs.remove(resourcePath);
    }
}

