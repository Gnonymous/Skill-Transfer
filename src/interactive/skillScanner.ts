import * as fs from 'fs-extra';
import * as path from 'path';
import { SkillInfo } from '../core/types';
import { AntigravityAdapter } from '../adapters/AntigravityAdapter';

const adapter = new AntigravityAdapter();

/**
 * 扫描技能源目录，获取所有技能信息
 */
export async function scanSkills(sourceDir: string): Promise<SkillInfo[]> {
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
                const isInstalled = await adapter.isInstalled(item.name);
                skills.push({
                    name: item.name,
                    isInstalled,
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
    const status = skill.isInstalled ? '🟢' : '⚪️';
    const statusText = skill.isInstalled ? 'Global 已安装' : '未安装';
    return `${status} ${skill.name} (${statusText})`;
}
