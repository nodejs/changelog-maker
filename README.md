# changelog-maker

**A git log to CHANGELOG.md tool**

[![npm](https://nodei.co/npm/changelog-maker.png?downloads=true&downloadRank=true)](https://nodei.co/npm/changelog-maker/)
[![npm](https://nodei.co/npm-dl/changelog-maker.png?months=6&height=3)](https://nodei.co/npm/changelog-maker/)

## Eh?

**changelog-maker** is a formalisation of the [Node.js](https://github.com/nodejs/node) CHANGELOG.md entry process but flexible enough to be used on other repositories.

**changelog-maker** will look at the git log of the current directory, pulling entries since the last tag. Commits with just a version number in the summary are removed, as are commits prior to, and including summaries that say `working on <version>` (this is an io.js / Node ism).

After collecting the list of commits, any that have `PR-URL: <url>` in them are looked up on GitHub and the labels of the pull request are collected, specifically looking for labels that start with `semver` (the assumption is that `semver-minor`, `semver-major` labels are used to indicate non-patch version bumps).

Finally, the list is formatted as Markdown and printed to stdout.

Each commit will come out something like this (on one line):

```
* [[`20f8e7f17a`](https://github.com/nodejs/io.js/commit/20f8e7f17a)] -
  **test**: remove flaky test functionality (Rod Vagg)
  [#812](https://github.com/nodejs/io.js/pull/812)
```

Note:

* When running `changelog-maker` on the command-line, the default GitHub repo is computed from the `package.json` that exists on `cwd`, otherwise fallback to `nodejs/node`, you can change this by supplying the user/org as the first argument and project as the second. e.g `changelog-maker joyent node`.
* Commit links will go to the assumed repo (default: nodejs/node)
* If a commit summary starts with a word, followed by a `:`, this is treated as a special label and rendered in bold
* Commits that have `semver*` labels on the pull request referred to in their `PR-URL` have those labels printed out at the start of the summary, in bold, upper cased.
* Pull request URLs come from the `PR-URL` data, if it matches the assumed repo (default: nodejs/node) then just a `#` followed by the number, if another repo then a full `user/project#number`.

When printing to a console some special behaviours are invoked:

* Commits with a summary that starts with `doc:` are rendered in grey
* Commits that have a `semver*` label on the pull request referred to in their `PR-URL` are rendered in bold green

## Install

```
$ npm i changelog-maker -g
```

## Usage

**`changelog-maker [--simple] [--group] [--start-ref=<ref>] [--end-ref=<ref>] [github-user[, github-project]]`**

* `github-user` and `github-project` should point to the GitHub repository that can be used to find the `PR-URL` data if just an issue number is provided and will also impact how the PR-URL issue numbers are displayed
* `--quiet` do not print to `process.stdout`
* `--all` process all commits since beginning, instead of last tag.
* `--simple` will print a simple form, without additional Markdown cruft
* `--group` will reorder commits so that they are listed in groups where the `xyz:` prefix of the commit message defines the group. Commits are listed in original order _within_ group.
* `--start-ref=<ref>` will use the given git `<ref>` as a starting point rather than the _last tag_. The `<ref>` can be anything commit-ish including a commit sha, tag, branch name. If you specify a `--start-ref` argument the commit log will not be pruned so that version commits and `working on <version>` commits are left in the list.
* `--end-ref=<ref>` will use the given git `<ref>` as a end-point rather than the _now_. The `<ref>` can be anything commit-ish including a commit sha, tag, branch name.

## License

**changelog-maker** is Copyright (c) 2015 Rod Vagg [@rvagg](https://twitter.com/rvagg) and licenced under the MIT licence. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE.md file for more details.
