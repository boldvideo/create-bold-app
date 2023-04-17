#!/usr/bin/env node

import meow from "meow";
import validatePackageName from "validate-npm-package-name";
import commandExists from "command-exists";
import ora from "ora";
import { execa } from "execa";
import chalk from "chalk";
import gradient from "gradient-string";
import prompts from "prompts";
import { exec } from "child_process";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { EOL } from "os";

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

const copyTemplate = async (src: string, dest: string) => {
  const ncp = async (source: string, destination: string) => {
    const entries = await fs.promises.readdir(source, { withFileTypes: true });

    await fs.promises.mkdir(destination, { recursive: true });

    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await ncp(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  };

  await ncp(src, dest);
};

const detectPackageManager = async (): Promise<string | null> => {
  if (await commandExists("pnpm")) {
    return "pnpm";
  } else if (await commandExists("npm")) {
    return "npm";
  } else if (await commandExists("yarn")) {
    return "yarn";
  } else {
    return null;
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

const createPackageJson = async (folderName: string, appName: string) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const packageJsonPath = path.join(
    __dirname,
    "..",
    "templates",
    "next-tw-starter",
    "package.json"
  );

  const packageJsonContent = await fs.promises.readFile(packageJsonPath, {
    encoding: "utf-8",
  });
  const packageJson = JSON.parse(packageJsonContent);
  packageJson.name = appName;

  const destPackageJsonPath = path.join(folderName, "package.json");
  await fs.promises.writeFile(
    destPackageJsonPath,
    JSON.stringify(packageJson, null, 2)
  );
};

const createEnvFiles = async (folderName: string, apiKey: string) => {
  const envDevelopmentContent = `NEXT_PUBLIC_BOLD_API_KEY=${apiKey}${EOL}`;
  const envProductionContent = `NEXT_PUBLIC_BOLD_API_KEY=${EOL}`;

  const envDevelopmentPath = path.join(folderName, ".env.development");
  const envProductionPath = path.join(folderName, ".env.production");

  await fs.promises.writeFile(envDevelopmentPath, envDevelopmentContent);
  await fs.promises.writeFile(envProductionPath, envProductionContent);
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
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const templatePath = path.join(
      __dirname,
      "..",
      "templates",
      "next-tw-starter"
    );
    await copyTemplate(templatePath, appName);
    await createPackageJson(appName, appName);
    await createEnvFiles(appName, apiKey);
    const packageManager = await detectPackageManager();
    await installDependencies(appName, packageManager);
    showSuccessMessage(appName, packageManager);
  } catch (error) {
    console.error(chalk.red("Error creating Bold app:"), error);
  }
};

const cli = meow(
  `
    Usage
      $ create-bold-app [appName]

    Options
      --version   Show version number

    Examples
      $ create-bold-app my-test-app
`,
  {
    importMeta: import.meta,
    flags: {
      version: {
        type: "boolean",
        alias: "v",
      },
    },
  }
);

if (cli.flags.version) {
  console.log(cli.pkg.version);
} else {
  createBoldApp(cli.input[0]);
}
