import * as path from 'path';
import {
    createPrompt,
    useState,
    useKeypress,
    usePrefix,
    useMemo,
    isEnterKey,
    isUpKey,
    isDownKey,
    isSpaceKey,
    isBackspaceKey,
    makeTheme,
    type Theme,
} from '@inquirer/core';
import { input, select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';

import { getSkillSourceDir, setSkillSourceDir, validateDirectory } from './config';
import { scanSkills } from './skillScanner';
import { AntigravityAdapter } from '../adapters/AntigravityAdapter';
import { SkillInfo, ImportMode, ResourceType, Adapter } from '../core/types';
import * as ui from './ui';

const adapter = new AntigravityAdapter();

interface SkillChoice {
    name: string;
    isWorkflowInstalled: boolean;
    isSkillInstalled: boolean;
    sourcePath: string;
    checked: boolean;
}

interface SkillSelectResult {
    action: 'import' | 'exit' | 'config' | 'delete';
    selectedSkills: SkillChoice[];
}

/**
 * Custom skill select Prompt
 * Supports: Space multi-select, Enter confirm (selects current if none), D to delete
 */
const skillSelectPrompt = createPrompt<SkillSelectResult, { skills: SkillInfo[]; message: string }>(
    (config, done) => {
        const { skills, message } = config;
        const prefix = usePrefix({ status: 'idle' });

        const [choices, setChoices] = useState<SkillChoice[]>(() =>
            skills.map(s => ({ ...s, checked: false }))
        );
        const [cursorIndex, setCursorIndex] = useState(0);
        const [status, setStatus] = useState<'pending' | 'done'>('pending');
        const [errorMsg, setErrorMsg] = useState<string | null>(null);

        useKeypress(async (key, rl) => {
            if (status === 'done') return;
            setErrorMsg(null);

            // Up/Down navigation
            if (isUpKey(key)) {
                const newIndex = cursorIndex > 0 ? cursorIndex - 1 : choices.length - 1;
                setCursorIndex(newIndex);
                return;
            }

            if (isDownKey(key)) {
                const newIndex = cursorIndex < choices.length - 1 ? cursorIndex + 1 : 0;
                setCursorIndex(newIndex);
                return;
            }

            // Space to toggle selection
            if (isSpaceKey(key)) {
                const newChoices = choices.map((c: SkillChoice, i: number) =>
                    i === cursorIndex ? { ...c, checked: !c.checked } : c
                );
                setChoices(newChoices);
                return;
            }

            // D key to delete installed skill
            if (key.name === 'd' || key.name === 'delete' || isBackspaceKey(key)) {
                const currentSkill = choices[cursorIndex];
                if (!currentSkill.isWorkflowInstalled && !currentSkill.isSkillInstalled) {
                    setErrorMsg('Can only delete installed skills');
                    return;
                }
                // Return 'delete' action
                setStatus('done');
                done({ action: 'delete' as any, selectedSkills: [{ ...currentSkill, checked: true }] });
                return;
            }

            // Enter to confirm
            if (isEnterKey(key)) {
                const selected = choices.filter(c => c.checked);
                // If no selection, select current cursor item
                if (selected.length === 0) {
                    const currentSkill = choices[cursorIndex];
                    setStatus('done');
                    done({ action: 'import', selectedSkills: [{ ...currentSkill, checked: true }] });
                } else {
                    setStatus('done');
                    done({ action: 'import', selectedSkills: selected });
                }
                return;
            }

            // Q to quit
            if (key.name === 'q') {
                setStatus('done');
                done({ action: 'exit', selectedSkills: [] });
                return;
            }

            // C to change config
            if (key.name === 'c') {
                setStatus('done');
                done({ action: 'config', selectedSkills: [] });
                return;
            }

            // Ignore all other keys (don't do anything)
        });

        // Render list with W (workflow) and S (skill) status indicators
        const renderedChoices = choices.map((choice, index) => {
            const num = `${index + 1}.`;
            const cursor = index === cursorIndex ? chalk.cyan('>') : ' ';
            const checkbox = choice.checked ? chalk.green('◉') : chalk.gray('○');
            const wStatus = choice.isWorkflowInstalled ? chalk.green('W') : chalk.gray('W');
            const sStatus = choice.isSkillInstalled ? chalk.green('S') : chalk.gray('S');
            const name = index === cursorIndex
                ? chalk.cyan(choice.name)
                : chalk.white(choice.name);
            return `   ${cursor} ${num.padEnd(3)} ${checkbox} [${wStatus}|${sStatus}] ${name}`;
        }).join('\n');

        // Help bar at bottom (like reference design)
        const helpItems = [
            '↑↓',
            chalk.white('Enter'),
            chalk.white('Space') + ' Select',
            chalk.white('D') + ' Delete',
            chalk.white('C') + ' Config',
            chalk.white('Q') + ' Quit',
        ];
        const helpText = chalk.gray('\n\n   ' + helpItems.join('  |  '));

        const errorLine = errorMsg ? chalk.red(`\n   ${errorMsg}`) : '';

        return `   ${chalk.bold.cyan('Select skills to import:')}\n\n${renderedChoices}${helpText}${errorLine}`;
    }
);

/**
 * 交互模式主入口
 */
export async function runInteractiveMode(): Promise<void> {
    ui.printWelcome();

    // Phase 1: Initialize environment
    let sourceDir = await initializeSourceDir();
    if (!sourceDir) {
        ui.printError('Skill source directory not set, exiting.');
        return;
    }

    // Main loop
    while (true) {
        ui.clearScreen();
        ui.printWelcome();
        ui.printSourceDir(sourceDir);

        // Step 1: Select target tool FIRST
        console.log(chalk.dim('   Step 1: Select target tool\n'));
        const toolAction = await select({
            message: 'Select target tool:',
            choices: [
                { name: 'Antigravity (Google Gemini)', value: 'antigravity' },
                { name: chalk.dim('Claude Code (Coming soon)'), value: 'claude', disabled: true },
                { name: chalk.dim('Cursor (Coming soon)'), value: 'cursor', disabled: true },
                { name: chalk.dim('Codex (Coming soon)'), value: 'codex', disabled: true },
                { name: chalk.gray('Exit'), value: 'exit' },
            ],
        });

        if (toolAction === 'exit') {
            console.log(chalk.gray('\n   Goodbye!\n'));
            break;
        }

        const targetTool = toolAction;

        // Get adapter based on selection
        // Currently only Antigravity is available
        const currentAdapter = adapter; // Use the global adapter instance

        // Step 2: Scan skills using the selected adapter
        const spinner = ora('Scanning skills directory...').start();
        let skills: SkillInfo[];
        try {
            skills = await scanSkills(sourceDir, currentAdapter);
            spinner.stop();
        } catch (error) {
            spinner.fail('Scan failed');
            ui.printError(error instanceof Error ? error.message : String(error));
            break;
        }

        if (skills.length === 0) {
            ui.printWarning('No skills found (requires SKILL.md file)');
            const shouldContinue = await confirm({
                message: 'Change skill source directory?',
                default: true,
            });
            if (shouldContinue) {
                const newDir = await promptSourceDir();
                if (newDir) {
                    sourceDir = newDir;
                    await setSkillSourceDir(sourceDir);
                    ui.printSuccess(`Source directory updated: ${sourceDir}`);
                }
                continue;
            } else {
                break;
            }
        }

        console.log(chalk.dim(`\n   Found ${skills.length} skill(s)`));
        console.log(chalk.dim('   [W] = Workflow installed, [S] = Skill installed\n'));

        // Step 3: Use custom prompt to select skills
        try {
            const result = await skillSelectPrompt({
                skills,
                message: '选择要导入的技能:',
            });

            if (result.action === 'exit') {
                console.log(chalk.gray('\n   Goodbye!\n'));
                break;
            }

            if (result.action === 'config') {
                const newDir = await promptSourceDir();
                if (newDir) {
                    sourceDir = newDir;
                    await setSkillSourceDir(sourceDir);
                    ui.printSuccess(`Source directory updated: ${sourceDir}`);
                }
                continue;
            }

            if (result.action === 'import' && result.selectedSkills.length > 0) {
                await handleImportSkills(result.selectedSkills, currentAdapter);
            }

            if (result.action === 'delete' && result.selectedSkills.length > 0) {
                await handleDeleteSkill(result.selectedSkills[0], currentAdapter);
            }
        } catch (error) {
            // User pressed Ctrl+C
            if (error instanceof Error && error.name === 'ExitPromptError') {
                console.log(chalk.gray('\n   Goodbye!\n'));
                break;
            }
            throw error;
        }
    }
}

/**
 * Initialize skill source directory
 */
async function initializeSourceDir(): Promise<string | undefined> {
    let sourceDir = await getSkillSourceDir();

    if (!sourceDir) {
        console.log(chalk.yellow('   First time setup - please set your skills directory'));
        sourceDir = await promptSourceDir();
        if (sourceDir) {
            await setSkillSourceDir(sourceDir);
            ui.printSuccess(`Source directory saved: ${sourceDir}`);
        }
    } else {
        const isValid = await validateDirectory(sourceDir);
        if (!isValid) {
            ui.printWarning(`Previously saved directory is invalid: ${sourceDir}`);
            sourceDir = await promptSourceDir();
            if (sourceDir) {
                await setSkillSourceDir(sourceDir);
                ui.printSuccess(`Source directory updated: ${sourceDir}`);
            }
        }
    }

    return sourceDir;
}

/**
 * Prompt user to input skill source directory
 */
async function promptSourceDir(): Promise<string | undefined> {
    const inputPath = await input({
        message: 'Enter skill source directory path:',
        validate: async (value) => {
            if (!value.trim()) {
                return 'Path cannot be empty';
            }
            const isValid = await validateDirectory(value);
            if (!isValid) {
                return 'Path does not exist or is not a directory';
            }
            return true;
        },
    });

    return path.resolve(inputPath);
}

/**
 * Handle importing skills
 */
async function handleImportSkills(selectedSkills: SkillChoice[], currentAdapter: Adapter): Promise<void> {
    console.log('');

    // Select resource type
    const resourceAction = await select({
        message: 'Select install type:',
        choices: [
            { name: 'Workflow - 作为工作流安装 (SKILL.md 会被重命名)', value: 'workflow' },
            { name: 'Skill    - 作为技能安装 (整个文件夹复制)', value: 'skill' },
            { name: chalk.gray('Cancel'), value: 'cancel' },
        ],
    });

    if (resourceAction === 'cancel') {
        return;
    }
    const resourceType = resourceAction as ResourceType;

    // Select mode
    const modeAction = await select({
        message: 'Select import mode:',
        choices: [
            { name: 'Global - Install to global directory', value: 'global' },
            { name: 'Local  - Install to a specific project', value: 'local' },
            { name: chalk.gray('Cancel'), value: 'cancel' },
        ],
    });

    if (modeAction === 'cancel') {
        return;
    }
    const mode = modeAction as ImportMode;

    let projectPath = process.cwd();
    if (mode === 'local') {
        projectPath = await input({
            message: 'Enter project path:',
            default: process.cwd(),
            validate: async (value) => {
                const isValid = await validateDirectory(value);
                return isValid || 'Path does not exist or is not a directory';
            },
        });
    }

    // Confirm
    const skillNames = selectedSkills.map(s => s.name).join(', ');
    const resourceTypeName = resourceType === 'skill' ? 'Skill' : 'Workflow';
    const confirmed = await confirm({
        message: `Import [${skillNames}] as ${resourceTypeName} to ${mode === 'global' ? 'Global' : projectPath}?`,
        default: true,
    });

    if (!confirmed) {
        ui.printInfo('Cancelled');
        await pressEnterToContinue();
        return;
    }

    // Execute import
    console.log('');
    const spinner = ora('Importing...').start();
    let successCount = 0;
    let failCount = 0;

    for (const skill of selectedSkills) {
        try {
            spinner.text = `Importing: ${skill.name}`;
            await currentAdapter.import(skill.sourcePath, projectPath, mode, resourceType);
            successCount++;
        } catch (error) {
            failCount++;
            spinner.warn(`Import failed: ${skill.name}`);
        }
    }

    spinner.stop();
    console.log('');
    ui.printSuccess(`Import complete! Success: ${successCount}, Failed: ${failCount}`);

    await pressEnterToContinue();
}

/**
 * Handle deleting a single resource (skill or workflow)
 */
async function handleDeleteSkill(skill: SkillChoice, currentAdapter: Adapter): Promise<void> {
    console.log('');

    // Select resource type to delete
    const action = await select({
        message: 'Select resource type to delete:',
        choices: [
            { name: 'Workflow', value: 'workflow' },
            { name: 'Skill', value: 'skill' },
            { name: chalk.gray('Cancel'), value: 'cancel' },
        ],
    });

    if (action === 'cancel') {
        return;
    }

    const resourceType = action as ResourceType;

    const typeName = resourceType === 'skill' ? '技能' : '工作流';
    const confirmed = await confirm({
        message: chalk.red(`Delete ${typeName} "${skill.name}"?`),
        default: false,
    });

    if (!confirmed) {
        ui.printInfo('Cancelled');
        await pressEnterToContinue();
        return;
    }

    try {
        if (currentAdapter.deleteResource) {
            await currentAdapter.deleteResource(skill.name, resourceType);
            ui.printSuccess(`Deleted: ${skill.name}`);
        } else {
            ui.printError('Delete not supported by this adapter');
        }
    } catch (err) {
        ui.printError(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    await pressEnterToContinue();
}

/**
 * Press enter to continue
 */
async function pressEnterToContinue(): Promise<void> {
    await input({
        message: chalk.gray('Press Enter to continue...'),
    });
}

