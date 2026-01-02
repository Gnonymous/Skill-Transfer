import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.skill-transfer');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface Config {
    skillSourceDir?: string;
}

/**
 * 读取配置文件
 */
export async function loadConfig(): Promise<Config> {
    try {
        if (await fs.pathExists(CONFIG_FILE)) {
            const content = await fs.readFile(CONFIG_FILE, 'utf-8');
            return JSON.parse(content) as Config;
        }
    } catch (error) {
        // 配置文件损坏，返回空配置
        console.warn('配置文件读取失败，使用默认配置');
    }
    return {};
}

/**
 * 保存配置到文件
 */
export async function saveConfig(config: Config): Promise<void> {
    await fs.ensureDir(CONFIG_DIR);
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * 获取技能源目录
 */
export async function getSkillSourceDir(): Promise<string | undefined> {
    const config = await loadConfig();
    return config.skillSourceDir;
}

/**
 * 设置技能源目录
 */
export async function setSkillSourceDir(dirPath: string): Promise<void> {
    const config = await loadConfig();
    config.skillSourceDir = dirPath;
    await saveConfig(config);
}

/**
 * 验证路径是否为有效目录
 */
export async function validateDirectory(dirPath: string): Promise<boolean> {
    try {
        const absPath = path.resolve(dirPath);
        const stat = await fs.stat(absPath);
        return stat.isDirectory();
    } catch {
        return false;
    }
}
