"use strict";

const log = require("npmlog");
const childProcess = require("@spryker-lerna/child-process");

module.exports.hasCommit = hasCommit;

/**
 * @param {import("@spryker-lerna/child-process").ExecOpts} opts
 */
function hasCommit(opts) {
  log.silly("hasCommit");
  let retVal;

  try {
    childProcess.execSync("git", ["log"], opts);
    retVal = true;
  } catch (e) {
    retVal = false;
  }

  log.verbose("hasCommit", retVal);
  return retVal;
}
