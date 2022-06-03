"use strict";

const pMap = require("p-map");

const { Command } = require("@spryker-lerna/command");
const { npmRunScript, npmRunScriptStreaming } = require("@spryker-lerna/npm-run-script");
const { output } = require("@spryker-lerna/output");
const { Profiler } = require("@spryker-lerna/profiler");
const { timer } = require("@spryker-lerna/timer");
const { runTopologically } = require("@spryker-lerna/run-topologically");
const { ValidationError } = require("@spryker-lerna/validation-error");
const { getFilteredPackages } = require("@spryker-lerna/filter-options");
const { performance } = require("perf_hooks");

module.exports = factory;

function factory(argv) {
  return new RunCommand(argv);
}

class RunCommand extends Command {
  get requiresGit() {
    return false;
  }

  initialize() {
    const { script, npmClient = "npm" } = this.options;

    this.script = script;
    this.args = this.options["--"] || [];
    this.npmClient = npmClient;

    if (!script) {
      throw new ValidationError("ENOSCRIPT", "You must specify a lifecycle script to run");
    }

    // inverted boolean options
    this.bail = this.options.bail !== false;
    this.prefix = this.options.prefix !== false;

    let chain = Promise.resolve();

    chain = chain.then(() => getFilteredPackages(this.packageGraph, this.execOpts, this.options));
    chain = chain.then((filteredPackages) => {
      this.packagesWithScript =
        script === "env"
          ? filteredPackages
          : filteredPackages.filter((pkg) => pkg.scripts && pkg.scripts[script]);
    });

    return chain.then(() => {
      this.count = this.packagesWithScript.length;
      this.packagePlural = this.count === 1 ? "package" : "packages";
      this.joinedCommand = [this.npmClient, "run", this.script].concat(this.args).join(" ");

      if (!this.count) {
        this.logger.success("run", `No packages found with the lifecycle script '${script}'`);

        // still exits zero, aka "ok"
        return false;
      }
    });
  }

  execute() {
    if (!this.options.useNx) {
      this.logger.info(
        "",
        "Executing command in %d %s: %j",
        this.count,
        this.packagePlural,
        this.joinedCommand
      );
    }

    let chain = Promise.resolve();
    const getElapsed = timer();

    if (this.options.useNx) {
      chain = chain.then(() => this.runScriptsUsingNx());
    } else if (this.options.parallel) {
      chain = chain.then(() => this.runScriptInPackagesParallel());
    } else if (this.toposort) {
      chain = chain.then(() => this.runScriptInPackagesTopological());
    } else {
      chain = chain.then(() => this.runScriptInPackagesLexical());
    }

    if (this.bail) {
      // only the first error is caught
      chain = chain.catch((err) => {
        process.exitCode = err.exitCode;

        // rethrow to halt chain and log properly
        throw err;
      });
    } else {
      // detect error (if any) from collected results
      chain = chain.then((results) => {
        /* istanbul ignore else */
        if (results.some((result) => result.failed)) {
          // propagate "highest" error code, it's probably the most useful
          const codes = results.filter((result) => result.failed).map((result) => result.exitCode);
          const exitCode = Math.max(...codes, 1);

          this.logger.error("", "Received non-zero exit code %d during execution", exitCode);
          process.exitCode = exitCode;
        }
      });
    }

    return chain.then(() => {
      this.logger.success(
        "run",
        "Ran npm script '%s' in %d %s in %ss:",
        this.script,
        this.count,
        this.packagePlural,
        (getElapsed() / 1000).toFixed(1)
      );
      this.logger.success("", this.packagesWithScript.map((pkg) => `- ${pkg.name}`).join("\n"));
    });
  }

  getOpts(pkg) {
    // these options are NOT passed directly to execa, they are composed in npm-run-script
    return {
      args: this.args,
      npmClient: this.npmClient,
      prefix: this.prefix,
      reject: this.bail,
      pkg,
    };
  }

  getRunner() {
    return this.options.stream
      ? (pkg) => this.runScriptInPackageStreaming(pkg)
      : (pkg) => this.runScriptInPackageCapturing(pkg);
  }

  runScriptInPackagesTopological() {
    let profiler;
    let runner;

    if (this.options.profile) {
      profiler = new Profiler({
        concurrency: this.concurrency,
        log: this.logger,
        outputDirectory: this.options.profileLocation,
      });

      const callback = this.getRunner();
      runner = (pkg) => profiler.run(() => callback(pkg), pkg.name);
    } else {
      runner = this.getRunner();
    }

    let chain = runTopologically(this.packagesWithScript, runner, {
      concurrency: this.concurrency,
      rejectCycles: this.options.rejectCycles,
    });

    if (profiler) {
      chain = chain.then((results) => profiler.output().then(() => results));
    }

    return chain;
  }

  runScriptsUsingNx() {
    performance.mark("init-local");
    // eslint-disable-next-line global-require,import/no-extraneous-dependencies,node/no-extraneous-require
    const nxOutput = require("nx/src/utils/output");
    nxOutput.output.cliName = "Lerna (powered by Nx)";
    nxOutput.output.formatCommand = (message) => message.replace(":", " ");
    if (this.options.ci) {
      process.env.CI = "true";
    }
    // eslint-disable-next-line global-require,import/no-extraneous-dependencies,node/no-extraneous-require
    const { runMany } = require("nx/src/command-line/run-many");
    return runMany({
      projects: this.packagesWithScript.map((p) => p.name).join(","),
      target: this.script,
      outputStyle: this.options.stream ? "stream" : "static",
      parallel: this.options.concurrency,
      _: this.args,
    });
  }

  runScriptInPackagesParallel() {
    return pMap(this.packagesWithScript, (pkg) => this.runScriptInPackageStreaming(pkg));
  }

  runScriptInPackagesLexical() {
    return pMap(this.packagesWithScript, this.getRunner(), { concurrency: this.concurrency });
  }

  runScriptInPackageStreaming(pkg) {
    return npmRunScriptStreaming(this.script, this.getOpts(pkg));
  }

  runScriptInPackageCapturing(pkg) {
    const getElapsed = timer();
    return npmRunScript(this.script, this.getOpts(pkg)).then((result) => {
      this.logger.info(
        "run",
        "Ran npm script '%s' in '%s' in %ss:",
        this.script,
        pkg.name,
        (getElapsed() / 1000).toFixed(1)
      );
      output(result.stdout);

      return result;
    });
  }
}

module.exports.RunCommand = RunCommand;
