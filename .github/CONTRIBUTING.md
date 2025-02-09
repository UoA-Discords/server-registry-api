# Contributing <!-- omit in toc -->

## Table of Contents <!-- omit in toc -->

- [Repository Structure](#repository-structure)
- [Requirements](#requirements)
- [Pipeline](#pipeline)
- [Other](#other)


### Repository Structure

The overall structure and layout of this repository is largely based off the [bulletproof node.js project architecture](https://www.softwareontheroad.com/ideal-nodejs-project-structure/#folder), you can find README's in most of the directories within the [src](../src/) folder that explain what they encapsulate.

### Requirements

The minimum requirements for code contributions are:

1. The code _must_ be compliant with the configured [ESLint rules](../.eslintrc.json).
2. All new and changed code should _should_ have a corresponding unit and/or integration test, with 100% coverage.
3. [Status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks) _must_ pass for the latest commit within your PR.

### Pipeline

Our [production API](https://registry.uoa-discords.com) is always up-to-date with the latest commit on the `main` branch, provided the CI passes.

### Other

It is highly recommended to join our [Discord server](https://discord.gg/VDAr7fEbs9) so we can help you!
