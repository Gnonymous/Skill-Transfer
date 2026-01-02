export type ImportMode = 'global' | 'local';

export interface Adapter {
    readonly name: string;
    getTargetDir(mode: ImportMode): string;
    import(sourcePath: string, projectRoot: string, mode: ImportMode): Promise<void>;
}
