#!/usr/bin/env node

import meow from "meow";
import validatePackageName from "validate-npm-package-name";
import ora from "ora";
import { execa } from "execa";
import chalk from "chalk";
import gradient from "gradient-string";
import prompts from "prompts";
import { exec, execSync } from "child_process";
import fs from "fs";
import path from "path";

const createFolder = (folderName: string) => {
  return new Promise<void>((resolve, reject) => {
    exec(`mkdir ${folderName}`, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

const detectPackageManager = (): string => {
  enum PackageManager {
    NPM = "npm",
    YARN = "yarn",
    PNPM = "pnpm",
  }

  const managers = Object.values(PackageManager);
  for (const manager of managers) {
    if (
      process.env.npm_config_user_agent &&
      process.env.npm_config_user_agent.startsWith(manager)
    ) {
      return manager;
    }
  }

  try {
    execSync("npm --version", { stdio: "ignore" });
    return PackageManager.NPM;
  } catch {
    try {
      try {
        execSync("yarn --version", { stdio: "ignore" });
        return PackageManager.YARN;
      } catch {
        execSync("pnpm --version", { stdio: "ignore" });
        return PackageManager.PNPM;
      }
    } catch {
      return PackageManager.NPM;
    }
  }
};

const installDependencies = async (
  folderName: string,
  packageManager: string | null
) => {
  if (!packageManager) {
    console.error(chalk.red("No supported package manager found."));
    return;
  }

  const spinner = ora(
    `Installing dependencies using ${packageManager}...`
  ).start();
  process.chdir(folderName);

  const command = packageManager === "yarn" ? "yarn" : `${packageManager}`;
  const args = ["install"];
  try {
    await execa(command, args, { stdio: "pipe" });
    spinner.succeed(
      chalk.whiteBright(`Installed dependencies using ${packageManager}!`)
    );
  } catch (error) {
    spinner.fail(chalk.redBright.bold("Problem during installation:"));
    console.error(error);
    process.exit(0);
  }
};

const createPackageJson = async (appName: string) => {
  const packageJsonPath = path.join(appName, "package.json");

  const packageJsonContent = await fs.promises.readFile(
    packageJsonPath,
    "utf-8"
  );
  const packageJson = JSON.parse(packageJsonContent);

  packageJson.name = appName;

  await fs.promises.writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2)
  );
};

const createEnvFiles = async (folder: string, apiKey: string) => {
  const tmplPath = path.join(folder, ".env-template");
  const tmplContent = await fs.promises.readFile(tmplPath, "utf-8");

  const devContent = tmplContent.replace(
    "NEXT_PUBLIC_BOLD_API_KEY=",
    `NEXT_PUBLIC_BOLD_API_KEY=${apiKey}`
  );
  const prodContent = tmplContent;

  const devPath = path.join(folder, ".env.development");
  const prodPath = path.join(folder, ".env.production");

  await fs.promises.writeFile(devPath, devContent);
  await fs.promises.writeFile(prodPath, prodContent);

  // Remove the .env-template file
  await fs.promises.unlink(tmplPath);
};

const cleanUp = (folderName?: string) => {
  console.log();
  if (folderName && fs.existsSync(folderName)) {
    console.log(chalk.yellow("\nCleaning up..."));
    fs.rmSync(folderName, { recursive: true, force: true });
  }
  console.log(chalk.red("\nInterrupted. Exiting..."));
  console.log();
  process.exit(0);
};

const getAppName = async (appNameFromArg?: string): Promise<string> => {
  if (appNameFromArg) {
    const validationResult = validatePackageName(
      path.basename(path.resolve(appNameFromArg))
    );
    if (validationResult.validForNewPackages) {
      return appNameFromArg;
    }
    const problems = [
      ...(validationResult.errors || []),
      ...(validationResult.warnings || []),
    ];
    throw new Error("Your project name is invalid: " + problems![0]);
  }

  const response = await prompts(
    {
      type: "text",
      name: "appName",
      message: "What is the name of your app?",
      validate: (input: string) => {
        const validationResult = validatePackageName(
          path.basename(path.resolve(input))
        );
        if (validationResult.validForNewPackages) {
          return true;
        }
        const problems = [
          ...(validationResult.errors || []),
          ...(validationResult.warnings || []),
        ];
        return "Your project name is invalid: " + problems![0];
      },
    },
    { onCancel: () => cleanUp() }
  );

  return response.appName;
};

const showSuccessMessage = (appName: string, packageManager: string | null) => {
  console.log("");
  console.log(gradient.atlas("Bold app created successfully!"));
  console.log("");

  if (packageManager) {
    const startCommand =
      packageManager === "yarn"
        ? "yarn" + chalk.white(" dev")
        : packageManager + chalk.white(" run dev");
    console.log(chalk.white(`To start the app, run the following commands:`));
    console.log("");
    console.log("");
    console.log(chalk.cyan("      cd " + chalk.white(`${appName}`)));
    console.log(chalk.cyan("      " + startCommand));
    console.log("");
    console.log("");
  } else {
    console.log(
      chalk.yellow(
        `No supported package manager found. To start the app, install a package manager and run the dev script.`
      )
    );
  }
};

function debugLog(message: string) {
  if (cli.flags.debug) {
    console.log(chalk.gray(message));
  }
}

const createBoldApp = async (appNameFromArg?: string) => {
  //console.log(chalk.green(`Welcome to Create Bold App v${cli.pkg.version}!`));
  console.log();
  console.log();
  console.log(chalk.cyan(`Welcome to Create Bold App`));
  console.log();

  const appName = await getAppName(appNameFromArg);

  // Register signal handlers
  process.on("SIGINT", () => cleanUp(appName));
  process.on("SIGQUIT", () => cleanUp(appName));
  process.on("SIGBREAK", () => cleanUp(appName));

  // Check if folder already exists
  if (fs.existsSync(appName)) {
    console.error(
      chalk.red(
        `Error: The folder "${appName}" already exists. Please choose a different name or delete the existing folder.`
      )
    );
    return;
  }

  const response = await prompts(
    {
      type: "text",
      name: "apiKey",
      message:
        "Enter your Bold API key from https://app.boldvideo.io/settings:",
    },
    { onCancel: () => cleanUp(appName) }
  );

  const { apiKey } = response;

  console.log(
    chalk.gray(
      `  Creating your bold app "${appName}" with API key "${apiKey}"...`
    )
  );

  try {
    await createFolder(appName);

    const repo = "https://github.com/boldvideo/nextjs-starter.git";
    debugLog(`  Cloning Repo "${repo}"...`);
    await execa("git", ["clone", "--depth", "1", repo, appName]);

    // Remove the .git folder to create a fresh project
    debugLog(`  Cleaning Repo...`);
    await fs.promises.rm(path.join(appName, ".git"), {
      recursive: true,
      force: true,
    });

    debugLog(`  Creating package.json...`);
    await createPackageJson(appName);
    debugLog(`  Creating env files...`);
    await createEnvFiles(appName, apiKey);
    debugLog(`  Detecting package manager...`);
    const packageManager = detectPackageManager();
    debugLog(`  Installing dependencies using ${packageManager}...`);
    await installDependencies(appName, packageManager);
    showSuccessMessage(appName, packageManager);
  } catch (error) {
    console.error(chalk.red("Error creating Bold app:"), error);
  }
};

const cli = meow(
  `
    Usage
      $ create-bold-app [appName] [options]

    Options
      --debug, -d      Show debug information
      --version        Show version number

    Examples
      $ create-bold-app my-test-app -d
`,
  {
    importMeta: import.meta,
    flags: {
      version: {
        type: "boolean",
        alias: "v",
      },
      debug: {
        type: "boolean",
        alias: "d",
        default: false,
      },
    },
  }
);

if (cli.flags.version) {
  console.log(cli.pkg.version);
} else {
  createBoldApp(cli.input[0]);
}
