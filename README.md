# changelog-maker [![Build Status](https://github.com/nodejs/changelog-maker/workflows/Tests/badge.svg)](https://github.com/nodejs/changelog-maker/actions?workflow=Tests)

**A git log to CHANGELOG.md tool**

[![npm](https://nodei.co/npm/changelog-maker.png?downloads=true&downloadRank=true)](https://nodei.co/npm/changelog-maker/)
[![npm](https://nodei.co/npm-dl/changelog-maker.png?months=6&height=3)](https://nodei.co/npm/changelog-maker/)

## Eh?

**changelog-maker** is a formalisation of the [Node.js](https://github.com/nodejs/node) CHANGELOG.md entry process but flexible enough to be used on other repositories.

**changelog-maker** will look at the git log of the current directory, pulling entries since the last tag. Commits with just a version number in the summary are removed, as are commits prior to, and including summaries that say `working on <version>` (this is an io.js / Node ism).

After collecting the list of commits, any that have `PR-URL: <url>` in them are looked up on GitHub and the labels of the pull request are collected, specifically looking for labels that start with `semver` (the assumption is that `semver-minor`, `semver-major` labels are used to indicate non-patch version bumps).

Finally, the list is formatted as Markdown and printed to stdout.

Each commit will come out something like this (on one line):

```markdown
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

```shell
npm i changelog-maker -g
```

## Usage

**`changelog-maker [--plaintext|p] [--markdown|md] [--sha] [--group|-g] [--reverse] [--commit-url=<url/with/{ref}>] [--start-ref=<ref>] [--end-ref=<ref>] [github-user[, github-project]]`**

`github-user` and `github-project` should point to the GitHub repository that can be used to find the `PR-URL` data if just an issue number is provided and will also impact how the PR-URL issue numbers are displayed

* `--format`:          dictates what formatting the output will have. Possible options are: `simple`, `markdown`, `plaintext`, and `sha`. The default is to print a `simple` output suitable for stdout.
  - `simple`:            don't print full markdown output, good for console printing without the additional fluff.
  - `sha`:               print only the 10-character truncated commit hashes.
  - `plaintext`:         a very simple form, without commit details, implies `--group`.
  - `markdown`:          a Markdown formatted from, with links and proper escaping.
* `--sha`:             same as `--format=sha`.
* `--plaintext`:       same as `--format=plaintext`.
* `--markdown`:        same as `--format=markdown`.
* `--group`:           reorder commits so that they are listed in groups where the `xyz:` prefix of the commit message defines the group. Commits are listed in original order _within_ group.
* `--reverse`:         reverse the order of commits when printed, does not work with `--reverse`
* `--commit-url`:      pass in a url template which will be used to generate commit URLs for a repository not hosted in Github. `{ref}` is the placeholder that will be replaced with the commit, i.e. `--commit-url=https://gitlab.com/myUser/myRepo/commit/{ref}`
* `--start-ref=<ref>`: use the given git `<ref>` as a starting point rather than the _last tag_. The `<ref>` can be anything commit-ish including a commit sha, tag, branch name. If you specify a `--start-ref` argument the commit log will not be pruned so that version commits and `working on <version>` commits are left in the list.
* `--end-ref=<ref>`:   use the given git `<ref>` as a end-point rather than the _now_. The `<ref>` can be anything commit-ish including a commit sha, tag, branch name.
* `--filter-release`:  exclude Node-style release commits from the list. e.g. "Working on v1.0.0" or "2015-10-21 Version 2.0.0" and also "npm version X" style commits containing _only_ an `x.y.z` semver designator.
* `--quiet` or `-q`:   do not print to `process.stdout`
* `--all` or `-a`:     process all commits since beginning, instead of last tag.
* `--help` or `-h`:    show usage and help.

## Development

Tests require GitHub authentication in order to fetch pull request metadata. [ghauth](https://github.com/rvagg/ghauth) will generate, store and load a [personal access token](https://github.com/settings/tokens) in your local user configuration when changelog-maker is run during normal operation. To run the tests, you will need to ensure that you have a token in place. There are two ways to do this:

1. Run `node ./changelog-maker.js -a` to cause changelog-maker to fetch metadata on a commit with a `PR-URL`.

2. Manually generate a personal access token with `public_repo` scope. Then create a config.json file:

    ```json
    {
      "user": "MY_GITHUB_USERNAME",
      "token": "MY_SECRET_TOKEN"
    }
    ```

    `user` is your username, and `token` is the token you generated above. The location of `config.json` depends on the OS, please see <https://github.com/LinusU/node-application-config#config-location>

## License

**changelog-maker** is Copyright (c) 2015 Rod Vagg [@rvagg](https://twitter.com/rvagg) and licenced under the MIT licence. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE.md file for more details.
