export type ImportMode = 'global' | 'local';
export type ResourceType = 'workflow' | 'skill';

export interface SkillInfo {
    name: string;
    isWorkflowInstalled: boolean;
    isSkillInstalled: boolean;
    sourcePath: string;
}

export interface Adapter {
    readonly name: string;
    getTargetDir(mode: ImportMode, resourceType: ResourceType): string;
    import(sourcePath: string, projectRoot: string, mode: ImportMode, resourceType: ResourceType): Promise<void>;
    listInstalled?(resourceType: ResourceType): Promise<string[]>;
    deleteResource?(resourceName: string, resourceType: ResourceType): Promise<void>;
    isInstalled?(resourceName: string, resourceType: ResourceType): Promise<boolean>;
}
