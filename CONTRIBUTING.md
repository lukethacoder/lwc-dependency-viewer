# Contributing to LWC Dependency Viewer

LWC Dependency Viewer is written in Vanilla TypeScript; and is licensed under the MIT License.

## A few rules

By contributing to LWC Dependency Viewer, you confirm that the work you are submitting is yours and it will be licensed under the MIT License of the project.

To ensure uniformity in LWC Dependency Viewer's repository, every contributor must follow these set of rules:

- Commits must best informative and describe the commit. (e.g. `add x feature to web view`
- Have ESLint and Prettier installed on your IDE for code formatting.
- Follow the general Rust conventions
- Use camelCasing on any function/method/property in code you've contributed.

Please also take a look at the [Code of Conduct](https://github.com/lukethacoder/salesforce-trekken/blob/main/CODE_OF_CONDUCT.md).

## Here’s the process for contributing to LWC Dependency Viewer

- Fork the LWC Dependency Viewer repository, and clone it locally on your development machine.
- Find help wanted tickets that are up for grabs in GitHub. Comment to let everyone know you’re working on it and let a core contributor assign the issue to you. If there’s no ticket for what you want to work on, you are free to continue with your changes.
- If in some case you need to use another dependency, create a new issue requesting for the package to be reviewed.
- After writing your code, make sure it has been formatted with prettier and eslint.
- When your changes are checked in to your fork, make sure to test your code extensively. Your commits should also follow the commit conventions.
- Submit your pull request for a code review and wait for a LWC Dependency Viewer core contributor to review it.
- Last but not least, make sure to have fun with the code!

## Development workspace

### Recommended IDE setup

- IDE: Visual Studio Code (w/ Prettier & ESLint)
- Node.js (LTS recommended) & NPM
- pnpm Package Manager

### Building and testing your fork

While testing and making modifications to LWC Dependency Viewer, make sure to familiarise yourself with these three commands.

```bash
# Install dependencies
pnpm install

# Run the walk script to generate a new `output.json` file
pnpm walk

# Start the Vite dev server (opens up in http://localhost:5173)
pnpm dev
```