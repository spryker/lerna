"use strict";

const log = require("npmlog");
const childProcess = require("@spryker-lerna/child-process");

module.exports.getCurrentTags = getCurrentTags;

/**
 * Retrieve a list of git tags pointing to the current HEAD that match the provided pattern.
 * @param {import("@spryker-lerna/child-process").ExecOpts} execOpts
 * @param {string} matchingPattern
 * @returns {string[]}
 */
function getCurrentTags(execOpts, matchingPattern) {
  log.silly("getCurrentTags", "matching %j", matchingPattern);

  const opts = Object.assign({}, execOpts, {
    // don't reject due to non-zero exit code when there are no results
    reject: false,
  });

  return childProcess
    .exec("git", ["tag", "--sort", "version:refname", "--points-at", "HEAD", "--list", matchingPattern], opts)
    .then((result) => result.stdout.split("\n").filter(Boolean));
}
