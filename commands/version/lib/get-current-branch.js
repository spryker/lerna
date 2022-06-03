"use strict";

const log = require("npmlog");
const childProcess = require("@spryker-lerna/child-process");

module.exports.getCurrentBranch = getCurrentBranch;

/**
 * @param {import("@spryker-lerna/child-process").ExecOpts} opts
 */
function getCurrentBranch(opts) {
  log.silly("getCurrentBranch");

  const branch = childProcess.execSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], opts);
  log.verbose("currentBranch", branch);

  return branch;
}
