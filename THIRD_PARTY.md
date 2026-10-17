# Third-Party Components and Licenses

Guardian Wallet's own source code is MIT licensed (see [LICENSE](LICENSE)). The project depends on
the following third-party packages. All are used under their published open-source licenses; no
third-party source code was copied into this repository.

## Smart contracts

| Component | Version | License | Use |
|---|---|---|---|
| [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) | v5.7.0 | MIT | `Ownable`, `ReentrancyGuard`, `SafeERC20`, `IERC20` |
| [forge-std](https://github.com/foundry-rs/forge-std) | v1.17.0 | MIT OR Apache-2.0 | Foundry test and script helpers |
| [Foundry](https://github.com/foundry-rs/foundry) | 1.x | MIT OR Apache-2.0 | Build and test toolchain (not vendored in source) |
| [Solc](https://github.com/ethereum/solidity) | 0.8.24 | GPL-3.0 | Compiler binary in `contracts/bin/solc.exe` |

Pinned commits for the vendored Solidity libraries are recorded in `contracts/foundry.lock`.

## Agent service

| Component | Version | License | Use |
|---|---|---|---|
| [Fastify](https://github.com/fastify/fastify) | ^5.1.0 | MIT | HTTP API |
| [@fastify/cors](https://github.com/fastify/fastify-cors) | ^10.0.1 | MIT | CORS for the web client |
| [viem](https://github.com/wevm/viem) | ^2.21.0 | MIT | Chain reads, simulation, writes, log parsing |
| [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) | ^0.65.0 | MIT | Optional LLM planner |
| [dotenv](https://github.com/motdotla/dotenv) | ^16.4.5 | BSD-2-Clause | Environment loading |
| [tsx](https://github.com/privatenumber/tsx) | ^4.19.2 | MIT | TypeScript runner (dev and scripts) |
| [TypeScript](https://github.com/microsoft/TypeScript) | ^5.6.3 | Apache-2.0 | Compiler and type checking |
| [Vitest](https://github.com/vitest-dev/vitest) | ^2.1.5 | MIT | Test runner |
| [@types/node](https://github.com/DefinitelyTyped/DefinitelyTyped) | ^22.9.0 | MIT | Type definitions |

The agent uses Node's built-in `node:sqlite` and `node:crypto` modules; no additional database or
hashing dependency is included.

## Web application

| Component | Version | License | Use |
|---|---|---|---|
| [Next.js](https://github.com/vercel/next.js) | 14.2.18 | MIT | App Router frontend |
| [React](https://github.com/facebook/react) | ^18.3.1 | MIT | UI runtime |
| [wagmi](https://github.com/wevm/wagmi) | ^2.12.20 | MIT | Wallet connection and contract writes |
| [viem](https://github.com/wevm/viem) | ^2.21.0 | MIT | ABI encoding and typed clients |
| [@tanstack/react-query](https://github.com/TanStack/query) | ^5.59.16 | MIT | Async state for wagmi |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | ^3.4.14 | MIT | Styling |
| [PostCSS](https://github.com/postcss/postcss) | ^8.4.47 | MIT | CSS pipeline |
| [Autoprefixer](https://github.com/postcss/autoprefixer) | ^10.4.20 | MIT | CSS vendor prefixes |
| [@types/react](https://github.com/DefinitelyTyped/DefinitelyTyped) | ^18.3.12 | MIT | Type definitions |
| [@types/react-dom](https://github.com/DefinitelyTyped/DefinitelyTyped) | ^18.3.1 | MIT | Type definitions |

## Assets and design

- All UI copy, SVG icons, and layout were written for this project. No icon packs, fonts, or
  illustration libraries are bundled.
- The interface uses system font stacks; no licensed webfont is redistributed.
- Demo invoices in `demo/` are fictional and contain no real personal data.

## Notes on obligation

- `contracts/bin/solc.exe` is GPL-3.0. It is included only as a build tool for a Windows sandbox
  without network access and is not linked into the deployed contracts. Redistributors should keep
  its license notice or replace it with a compiler obtained from the official Solidity releases.
- MIT and BSD licenses require preserving copyright and permission notices when redistributing
  source or binaries. The upstream notices remain in each package under `node_modules/` and
  `contracts/lib/`, which are excluded from version control by `.gitignore`.
