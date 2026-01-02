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
import { SkillInfo, ImportMode } from '../core/types';
import * as ui from './ui';

const adapter = new AntigravityAdapter();

interface SkillChoice {
    name: string;
    isInstalled: boolean;
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
                if (!currentSkill.isInstalled) {
                    setErrorMsg('Can only delete installed (●) skills');
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

        // Render list (like reference design: numbered, arrow marker, colored)
        const renderedChoices = choices.map((choice, index) => {
            const num = `${index + 1}.`;
            const cursor = index === cursorIndex ? chalk.cyan('>') : ' ';
            const checkbox = choice.checked ? chalk.green('◉') : chalk.gray('○');
            const installed = choice.isInstalled ? chalk.green('●') : chalk.gray('○');
            const name = index === cursorIndex
                ? chalk.cyan(choice.name)
                : chalk.white(choice.name);
            const statusText = choice.isInstalled
                ? chalk.dim('Installed')
                : chalk.dim('Not installed');
            return `   ${cursor} ${num.padEnd(3)} ${checkbox} ${installed} ${name.padEnd(25)} ${statusText}`;
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

        // Scan skills
        const spinner = ora('Scanning skills directory...').start();
        let skills: SkillInfo[];
        try {
            skills = await scanSkills(sourceDir);
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

        console.log(chalk.dim(`   Found ${skills.length} skill(s)\n`));

        // Use custom prompt
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
                await handleImportSkills(result.selectedSkills);
            }

            if (result.action === 'delete' && result.selectedSkills.length > 0) {
                await handleDeleteSkill(result.selectedSkills[0]);
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
async function handleImportSkills(selectedSkills: SkillChoice[]): Promise<void> {
    console.log('');

    // Select target tool
    const targetTool = await select({
        message: 'Select target tool:',
        choices: [
            { name: 'Antigravity (Google Gemini)', value: 'antigravity' },
            { name: chalk.dim('Claude Code (Coming soon)'), value: 'claude', disabled: true },
            { name: chalk.dim('Cursor (Coming soon)'), value: 'cursor', disabled: true },
            { name: chalk.dim('Codex (Coming soon)'), value: 'codex', disabled: true },
        ],
    });

    // Select mode
    const mode = await select({
        message: 'Select import mode:',
        choices: [
            { name: 'Global - Install to global directory', value: 'global' as ImportMode },
            { name: 'Local  - Install to a specific project', value: 'local' as ImportMode },
        ],
    });

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
    const confirmed = await confirm({
        message: `Import [${skillNames}] to ${mode === 'global' ? 'Global' : projectPath}?`,
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
            await adapter.import(skill.sourcePath, projectPath, mode);
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
 * Handle deleting a single skill
 */
async function handleDeleteSkill(skill: SkillChoice): Promise<void> {
    console.log('');

    const confirmed = await confirm({
        message: chalk.red(`Delete skill "${skill.name}"?`),
        default: false,
    });

    if (!confirmed) {
        ui.printInfo('Cancelled');
        await pressEnterToContinue();
        return;
    }

    try {
        await adapter.deleteSkill(skill.name);
        ui.printSuccess(`Deleted: ${skill.name}`);
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

