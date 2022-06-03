"use strict";

const log = require("npmlog");
const childProcess = require("@spryker-lerna/child-process");

module.exports.isBehindUpstream = isBehindUpstream;

/**
 * @param {string} gitRemote
 * @param {string} branch
 * @param {import("@spryker-lerna/child-process").ExecOpts} opts
 */
function isBehindUpstream(gitRemote, branch, opts) {
  log.silly("isBehindUpstream");

  updateRemote(opts);

  const remoteBranch = `${gitRemote}/${branch}`;
  const [behind, ahead] = countLeftRight(`${remoteBranch}...${branch}`, opts);

  log.silly(
    "isBehindUpstream",
    `${branch} is behind ${remoteBranch} by ${behind} commit(s) and ahead by ${ahead}`
  );

  return Boolean(behind);
}

/**
 * @param {import("@spryker-lerna/command").ExecOpts} opts
 */
function updateRemote(opts) {
  // git fetch, but for everything
  childProcess.execSync("git", ["remote", "update"], opts);
}

/**
 * @param {string} symmetricDifference
 * @param {import("@spryker-lerna/command").ExecOpts} opts
 */
function countLeftRight(symmetricDifference, opts) {
  const stdout = childProcess.execSync(
    "git",
    ["rev-list", "--left-right", "--count", symmetricDifference],
    opts
  );

  return stdout.split("\t").map((val) => parseInt(val, 10));
}
