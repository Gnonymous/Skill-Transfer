#!/usr/bin/env node

import { program } from 'commander';
import { importCommand, ImportOptions } from '../src/commands/import';
import { ImportMode } from '../src/core/types';

program
    .name('st')
    .description('Skill Transfer CLI - 在不同 AI 工具间迁移技能配置')
    .version('1.0.0');

program
    .command('import <skill-path>')
    .description('将指定路径的技能文件夹内容导入到目标工具配置中')
    .requiredOption('-t, --target <tool>', '目标工具 (支持: antigravity)')
    .option('-m, --mode <mode>', '导入模式: global (默认) 或 local', 'global')
    .option('-p, --project <path>', '项目路径 (local 模式必需)')
    .action((skillPath: string, options: { target: string; mode: string; project?: string }) => {
        const modeValue = options.mode.toLowerCase() as ImportMode;
        const projectPath = options.project;

        if (modeValue !== 'global' && modeValue !== 'local') {
            console.error('错误: mode 必须是 "global" 或 "local"');
            process.exit(1);
        }

        if (modeValue === 'local' && !projectPath) {
            console.error('错误: local 模式需要通过 -p/--project 指定项目路径');
            process.exit(1);
        }

        const importOptions: ImportOptions = {
            target: options.target,
            mode: modeValue,
            projectPath: projectPath,
        };
        importCommand(skillPath, importOptions);
    });

program.parse();
