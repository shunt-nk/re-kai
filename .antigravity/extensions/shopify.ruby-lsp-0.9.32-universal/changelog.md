# vscode-ruby-lsp-v0.9.32
## 🐛 Bug Fixes

- Disable spring when running tests through the explorer (https://github.com/Shopify/ruby-lsp/pull/3711) by @vinistock



# vscode-ruby-lsp-v0.9.31
## 📦 Other Changes

- Remove RUBYOPT from ruby-lsp-test-exec (https://github.com/Shopify/ruby-lsp/pull/3673) by @vinistock
- Retain editor focus after Run In Terminal (https://github.com/Shopify/ruby-lsp/pull/3679) by @andyw8



# vscode-ruby-lsp-v0.9.30
## 🚧 Breaking Changes

- Use -r instead of RUBYOPT to require LSP reporters (https://github.com/Shopify/ruby-lsp/pull/3661) by @vinistock



# vscode-ruby-lsp-v0.9.29
## ✨ Enhancements

- Allow users to disable test related code lenses (https://github.com/Shopify/ruby-lsp/pull/3632) by @vinistock

## 🐛 Bug Fixes

- Show message when trying to run a test that hasn't been discovered (https://github.com/Shopify/ruby-lsp/pull/3631) by @vinistock

## 📦 Other Changes

- Collect add-ons versions for issue reporting (https://github.com/Shopify/ruby-lsp/pull/3611) by @snutij



# vscode-ruby-lsp-v0.9.28
## ✨ Enhancements

- feat: register profile command (https://github.com/Shopify/ruby-lsp/pull/3560) by @maxveldink

## 📦 Other Changes

- Pass workspace to telemetry on every error log (https://github.com/Shopify/ruby-lsp/pull/3580) by @egiurleo
- Increase the full test discovery rollout to 100% (https://github.com/Shopify/ruby-lsp/pull/3589) by @alexcrocha



# vscode-ruby-lsp-v0.9.27
## 🐛 Bug Fixes

- Remove git scheme from document selector (https://github.com/Shopify/ruby-lsp/pull/3540) by @vinistock
- Move chruby activation script into a file (https://github.com/Shopify/ruby-lsp/pull/3551) by @vinistock
- Automatically clear Ruby workspace cache if the path no longer exists (https://github.com/Shopify/ruby-lsp/pull/3573) by @vinistock

## 📦 Other Changes

- chore: remove deprecated activationEvents from extension package.json (https://github.com/Shopify/ruby-lsp/pull/3564) by @maxveldink
- Increase the full test discovery rollout to 70% (https://github.com/Shopify/ruby-lsp/pull/3574) by @alexcrocha
- add mise install path for `apt` installations (https://github.com/Shopify/ruby-lsp/pull/3532) by @jtannas



# vscode-ruby-lsp-v0.9.26
## ✨ Enhancements

- Show progress while discovering tests (https://github.com/Shopify/ruby-lsp/pull/3519) by @vinistock

## 📦 Other Changes

- Avoid shitfting editor focus when using test code lens (https://github.com/Shopify/ruby-lsp/pull/3527) by @vinistock



# vscode-ruby-lsp-v0.9.25
## 🐛 Bug Fixes

- Always reset run object on finalize (https://github.com/Shopify/ruby-lsp/pull/3495) by @vinistock
- Use a custom executable to hook to test explorer (https://github.com/Shopify/ruby-lsp/pull/3499) by @vinistock
- Use a workspace to port map instead of single value file (https://github.com/Shopify/ruby-lsp/pull/3502) by @vinistock

## 📦 Other Changes

- Bump new explorer rollout to 15% (https://github.com/Shopify/ruby-lsp/pull/3510) by @vinistock



# vscode-ruby-lsp-v0.9.24
## 🐛 Bug Fixes

- Use a progress middleware for indexing promise (https://github.com/Shopify/ruby-lsp/pull/3484) by @vinistock

## 📦 Other Changes

- Use remaining path as test file label (https://github.com/Shopify/ruby-lsp/pull/3479) by @vinistock
- Lazily discover test framework on execution (https://github.com/Shopify/ruby-lsp/pull/3480) by @vinistock
- Enable full test discovery for 5% of users (https://github.com/Shopify/ruby-lsp/pull/3489) by @alexcrocha



# vscode-ruby-lsp-v0.9.23
## ✨ Enhancements

- Add refresh support to the test explorer (https://github.com/Shopify/ruby-lsp/pull/3463) by @vinistock
- Automatically discover dynamically defined tests (https://github.com/Shopify/ruby-lsp/pull/3430) by @vinistock

## 🐛 Bug Fixes

- Avoid resetting framework tag if finding a file with no tests (https://github.com/Shopify/ruby-lsp/pull/3467) by @vinistock



# vscode-ruby-lsp-v0.9.22


# vscode-ruby-lsp-v0.9.21
## ✨ Enhancements

- Modify LinkedCancellationSource for asymmetric token cancellation (https://github.com/Shopify/ruby-lsp/pull/3450) by @alexcrocha
- Add support for continuous test runs (https://github.com/Shopify/ruby-lsp/pull/3451) by @alexcrocha

## 🐛 Bug Fixes

- Write TCP server port to a tempfile instead of using env var (https://github.com/Shopify/ruby-lsp/pull/3452) by @vinistock
- Automatically discover children of workspace test items (https://github.com/Shopify/ruby-lsp/pull/3448) by @vinistock



# vscode-ruby-lsp-v0.9.20
## 🐛 Bug Fixes

- Include debug and spawn in the list of promises to await (https://github.com/Shopify/ruby-lsp/pull/3444) by @vinistock
- Differentiate between regular termination and cancellation (https://github.com/Shopify/ruby-lsp/pull/3446) by @vinistock



# vscode-ruby-lsp-v0.9.19
## 🐛 Bug Fixes

- Require `bundler/setup` for running tests (https://github.com/Shopify/ruby-lsp/pull/3433) by @vinistock
- Always set RUBYOPT when running tests in terminal (https://github.com/Shopify/ruby-lsp/pull/3432) by @vinistock

## 📦 Other Changes

- Show message if we cannot find related files (https://github.com/Shopify/ruby-lsp/pull/3434) by @vinistock



# vscode-ruby-lsp-v0.9.18
## ✨ Enhancements

- Make run in terminal a proper explorer profile (https://github.com/Shopify/ruby-lsp/pull/3425) by @vinistock
- Connect code lens buttons to the new explorer (https://github.com/Shopify/ruby-lsp/pull/3426) by @vinistock


