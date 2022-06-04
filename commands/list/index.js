"use strict";

const { Command } = require("@spryker-lerna/command");
const listable = require("@spryker-lerna/listable");
const { output } = require("@spryker-lerna/output");
const { getFilteredPackages } = require("@spryker-lerna/filter-options");

module.exports = factory;

function factory(argv) {
  return new ListCommand(argv);
}

class ListCommand extends Command {
  get requiresGit() {
    return false;
  }

  initialize() {
    let chain = Promise.resolve();

    chain = chain.then(() => getFilteredPackages(this.packageGraph, this.execOpts, this.options));
    chain = chain.then((filteredPackages) => {
      this.result = listable.format(filteredPackages, this.options);
    });

    return chain;
  }

  execute() {
    // piping to `wc -l` should not yield 1 when no packages matched
    if (this.result.text.length) {
      output(this.result.text);
    }

    this.logger.success(
      "found",
      "%d %s",
      this.result.count,
      this.result.count === 1 ? "package" : "packages"
    );
  }
}

module.exports.ListCommand = ListCommand;
