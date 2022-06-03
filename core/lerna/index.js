"use strict";

const cli = require("@spryker-lerna/cli");

const addCmd = require("@spryker-lerna/add/command");
const bootstrapCmd = require("@spryker-lerna/bootstrap/command");
const changedCmd = require("@spryker-lerna/changed/command");
const cleanCmd = require("@spryker-lerna/clean/command");
const createCmd = require("@spryker-lerna/create/command");
const diffCmd = require("@spryker-lerna/diff/command");
const execCmd = require("@spryker-lerna/exec/command");
const importCmd = require("@spryker-lerna/import/command");
const infoCmd = require("@spryker-lerna/info/command");
const initCmd = require("@spryker-lerna/init/command");
const linkCmd = require("@spryker-lerna/link/command");
const listCmd = require("@spryker-lerna/list/command");
const publishCmd = require("@spryker-lerna/publish/command");
const runCmd = require("@spryker-lerna/run/command");
const versionCmd = require("@spryker-lerna/version/command");

const pkg = require("./package.json");

module.exports = main;

function main(argv) {
  const context = {
    lernaVersion: pkg.version,
  };

  return cli()
    .command(addCmd)
    .command(bootstrapCmd)
    .command(changedCmd)
    .command(cleanCmd)
    .command(createCmd)
    .command(diffCmd)
    .command(execCmd)
    .command(importCmd)
    .command(infoCmd)
    .command(initCmd)
    .command(linkCmd)
    .command(listCmd)
    .command(publishCmd)
    .command(runCmd)
    .command(versionCmd)
    .parse(argv, context);
}
