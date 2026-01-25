import * as fs from 'fs-extra';
import * as path from 'path';
import { SkillInfo, Adapter } from '../core/types';

/**
 * 扫描技能源目录，获取所有技能信息
 * @param sourceDir 源目录路径
 * @param adapter 适配器实例，用于检查安装状态
 */
export async function scanSkills(sourceDir: string, adapter: Adapter): Promise<SkillInfo[]> {
    const absSourceDir = path.resolve(sourceDir);

    if (!await fs.pathExists(absSourceDir)) {
        throw new Error(`技能源目录不存在: ${absSourceDir}`);
    }

    const items = await fs.readdir(absSourceDir, { withFileTypes: true });
    const skills: SkillInfo[] = [];

    for (const item of items) {
        if (item.isDirectory() && !item.name.startsWith('.')) {
            const skillPath = path.join(absSourceDir, item.name);
            // 检查是否包含 SKILL.md 文件（标准技能结构）
            const hasSkillFile = await fs.pathExists(path.join(skillPath, 'SKILL.md'));

            if (hasSkillFile) {
                // 同时检查 workflow 和 skill 两种安装状态
                const isWorkflowInstalled = adapter.isInstalled
                    ? await adapter.isInstalled(item.name, 'workflow')
                    : false;
                const isSkillInstalled = adapter.isInstalled
                    ? await adapter.isInstalled(item.name, 'skill')
                    : false;

                skills.push({
                    name: item.name,
                    isWorkflowInstalled,
                    isSkillInstalled,
                    sourcePath: skillPath,
                });
            }
        }
    }

    return skills;
}

/**
 * 获取技能显示名称（带状态标记）
 */
export function getSkillDisplayName(skill: SkillInfo): string {
    const wStatus = skill.isWorkflowInstalled ? '🟢' : '⚪️';
    const sStatus = skill.isSkillInstalled ? '🟢' : '⚪️';
    return `${skill.name} [W:${wStatus} S:${sStatus}]`;
}
