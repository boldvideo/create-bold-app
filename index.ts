#!/usr/bin/env node

import meow from "meow";
import validatePackageName from "validate-npm-package-name";
import terminalLink from "terminal-link";
import commandExists from "command-exists";
import ora from "ora";
import { execa } from "execa";
import chalk from "chalk";
import prompts from "prompts";
import { exec } from "child_process";
import fs from "fs";
import fse from "fs-extra";
import { fileURLToPath } from "url";
import path from "path";
import { EOL } from "os";

const logo = `
                                                            
  @@@@@@@@@@*      @@@@@@@@*   @@@@@@@@@@    @@@@@@@@@@@    
  @@@@@@@@@@@@  *@@@@@@@@@@@@@ @@@@@@@@@@    @@@@@@@@@@@@@  
  @@@@@@@@@@@@  @@@@@@@@@@@@@@@@@@@@@@@@@    @@@@@@@@@@@@@@ 
  @@@@@@@@@@@  @@@@@@@@@@@@@@@@@@@@@@@@@@    @@@@@@@@@@@@@@ 
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ @@@@@@@@@@@@@@ 
  @@@@@@@@@@@@@ @@@@@@@@@@@@@@ .@@@@@@@@@@@@ @@@@@@@@@@@@@  
  ............    ...........   ............ ............

`;

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
  await fse.copy(src, dest);
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
      chalk.green(`Installed dependencies using ${packageManager}!`)
    );
  } catch (error) {
    spinner.fail(chalk.redBright.bold("Problem during installation:"));
    console.error(error);
    process.exit(0);
  }
};

const createPackageJson = async (folderName: string, appName: string) => {
  const packageJson = {
    name: appName,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "next lint",
    },
    dependencies: {
      "@boldvideo/bold-js": "^0.1.0",
      "@mux/mux-player-react": "^1.9.0",
      "@next/font": "13.3.0",
      "@types/node": "18.15.11",
      "@types/react": "18.0.33",
      "@types/react-dom": "18.0.11",
      "@vercel/og": "^0.5.1",
      "date-fns": "^2.29.3",
      eslint: "8.37.0",
      "eslint-config-next": "13.2.4",
      next: "13.3.0",
      react: "18.2.0",
      "react-dom": "18.2.0",
      swr: "^2.1.1",
      typescript: "5.0.3",
    },
    devDependencies: {
      autoprefixer: "^10.4.14",
      postcss: "^8.4.21",
      tailwindcss: "^3.3.1",
    },
  };

  const packageJsonPath = path.join(folderName, "package.json");
  await fs.promises.writeFile(
    packageJsonPath,
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

  const response = await prompts({
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
  });

  return response.appName;
};

const showSuccessMessage = (appName: string, packageManager: string | null) => {
  console.log("");
  console.log(chalk.green("Bold app created successfully!"));
  console.log("");

  if (packageManager) {
    const startCommand =
      packageManager === "yarn" ? "yarn dev" : `${packageManager} run dev`;
    console.log(chalk.green(`To start the app, run the following commands:`));
    console.log("");
    console.log("");
    console.log(chalk.green(`      cd ${appName}`));
    console.log(chalk.green(`      ${startCommand}`));
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
  console.log(chalk.green("Welcome to Create Bold App!"));
  // console.log(chalk.green(logo + "Welcome to Create Bold App!"));

  const appName = await getAppName(appNameFromArg);
  // Check if folder already exists
  if (fs.existsSync(appName)) {
    console.error(
      chalk.red(
        `Error: The folder "${appName}" already exists. Please choose a different name or delete the existing folder.`
      )
    );
    return;
  }

  // const linkText = "get it here";
  // const apiKeyLink = terminalLink(
  //   linkText,
  //   "https://app.boldvideo.io/settings"
  // );
  const response = await prompts({
    type: "text",
    name: "apiKey",
    message: `Please enter your Bold Video API key (you can at https://app.boldvideo.io/settings):`,
  });

  const { apiKey } = response;

  console.log(
    chalk.blue(
      `Creating your bold app "${appName}" with API key "${apiKey}"...`
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
