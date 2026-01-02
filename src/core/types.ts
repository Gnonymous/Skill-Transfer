export type ImportMode = 'global' | 'local';

export interface SkillInfo {
    name: string;
    isInstalled: boolean;
    sourcePath: string;
}

export interface Adapter {
    readonly name: string;
    getTargetDir(mode: ImportMode): string;
    import(sourcePath: string, projectRoot: string, mode: ImportMode): Promise<void>;
    listInstalled?(): Promise<string[]>;
    deleteSkill?(skillName: string): Promise<void>;
    isInstalled?(skillName: string): Promise<boolean>;
}
