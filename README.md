# changelog-maker

**A git log to CHANGELOG.md tool**

[![npm](https://nodei.co/npm/changelog-maker.png?downloads=true&downloadRank=true)](https://nodei.co/npm/changelog-maker/)
[![npm](https://nodei.co/npm-dl/changelog-maker.png?months=6&height=3)](https://nodei.co/npm/changelog-maker/)

## Eh?

**changelog-maker** is a formalisation of the [io.js](https://github.com/iojs/io.js) CHANGELOG.md entry process but flexible enough to be used on other repositories.

**changelog-maker** will look at the git log of the current directory, pulling entries since the last tag. Commits with just a version number in the summary are removed, as are commits prior to, and including summaries that say `working on <version>` (this is an io.js / Node ism).

After collecting the list of commits, any that have `PR-URL: <url>` in them are looked up on GitHub and the labels of the pull request are collected, specifically looking for labels that start with `semver` (the assumption is that `semver-minor`, `semver-major` labels are used to indicate non-patch version bumps).

Finally, the list will be reversed, formatted as Markdown and printed to stdout.

Each commit will come out something like this (on one line):

```
* [[`20f8e7f17a`](https://github.com/iojs/io.js/commit/20f8e7f17a)] -
  **test**: remove flaky test functionality (Rod Vagg)
  [#812](https://github.com/iojs/io.js/pull/812)
```

Note:

* When running `changelog-maker` on the command-line, the default GitHub repo is iojs/io.js, you can change this by supplying the user/org as the first argument and project as the second. e.g `changelog-maker joyent/node`.
* Commit links will go to the assumed repo (default: iojs/io.js)
* If a commit summary starts with a word, followed by a `:`, this is treated as a special label and rendered in bold
* Commits that have `semver*` labels on the pull request referred to in their `PR-URL` have those labels printed out at the start of the summary, in bold, upper cased.
* Pull request URLs come from the `PR-URL` data, if it matches the assumed repo (default: iojs/io.js) then just a `#` followed by the number, if another repo then a full `user/project#number`.

When printing to a console some special behaviours are invoked:

* Commits with a summary that starts with `doc:` are rendered in grey
* Commits that have a `semver*` label on the pull request referred to in their `PR-URL` are rendered in bold green

## License

**changelog-maker** is Copyright (c) 2015 Rod Vagg [@rvagg](https://twitter.com/rvagg) and licenced under the MIT licence. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE.md file for more details.
