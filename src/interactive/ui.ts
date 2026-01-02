import chalk from 'chalk';

// ASCII Art Logo
const LOGO = `
   _____ _    _ _ _   _______                    __          
  / ____| |  (_) | | |__   __|                  / _|         
 | (___ | | ___| | |    | |_ __ __ _ _ __  ___ | |_ ___ _ __ 
  \\___ \\| |/ / | | |    | | '__/ _\` | '_ \\/ __||  _/ _ \\ '__|
  ____) |   <| | | |    | | | | (_| | | | \\__ \\| ||  __/ |   
 |_____/|_|\\_\\_|_|_|    |_|_|  \\__,_|_| |_|___/|_| \\___|_|   
`;

/**
 * Print welcome banner with ASCII logo
 */
export function printWelcome(): void {
    console.log(chalk.cyan(LOGO));
    console.log(chalk.gray('  Transfer AI coding skills between different tools.\n'));
}

/**
 * Print current source directory
 */
export function printSourceDir(dir: string): void {
    console.log(chalk.dim(`  Source: ${chalk.white(dir)}\n`));
}

/**
 * Print help bar at bottom (like the reference design)
 */
export function printHelpBar(): void {
    const items = [
        '↑↓',
        chalk.white('Enter'),
        chalk.white('Space') + ' Select',
        chalk.white('D') + ' Delete',
        chalk.white('C') + ' Config',
        chalk.white('Q') + ' Quit',
    ];
    console.log(chalk.gray('\n  ' + items.join('  |  ')));
}

/**
 * Print success message
 */
export function printSuccess(message: string): void {
    console.log(chalk.green(`  ✓ ${message}`));
}

/**
 * Print error message
 */
export function printError(message: string): void {
    console.log(chalk.red(`  ✗ ${message}`));
}

/**
 * Print warning message
 */
export function printWarning(message: string): void {
    console.log(chalk.yellow(`  ! ${message}`));
}

/**
 * Print info message
 */
export function printInfo(message: string): void {
    console.log(chalk.blue(`  i ${message}`));
}

/**
 * Format skill choice for display (used in custom prompt)
 */
export function formatSkillChoice(name: string, isInstalled: boolean): string {
    const status = isInstalled ? chalk.green('●') : chalk.gray('○');
    const statusText = isInstalled ? chalk.dim('Installed') : chalk.dim('Not installed');
    return `${status} ${name} ${statusText}`;
}

/**
 * Clear screen
 */
export function clearScreen(): void {
    console.clear();
}

