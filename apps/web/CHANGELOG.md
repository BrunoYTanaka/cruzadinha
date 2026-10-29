# Changelog

## [0.13.0](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.12.1...web-v0.13.0) (2026-10-29)


### Features

* add turnstile captcha to sign-up and password recovery ([71515ed](https://github.com/BrunoYTanaka/cruzadinha/commit/71515ed12cf9a1cb8d4d3b206b32f87dd219ea1e))
* optional automatic verification ([2262f14](https://github.com/BrunoYTanaka/cruzadinha/commit/2262f149825724a6dcaa8f498a53e66667bfda1c))
* **web:** add keyboard shortcuts dialog to the game screen ([48941c4](https://github.com/BrunoYTanaka/cruzadinha/commit/48941c46321e344ca19f2cf34e9f11414064cbb2))
* **web:** add the keyboard shortcuts dialog to the game screen ([32957c2](https://github.com/BrunoYTanaka/cruzadinha/commit/32957c22f3af617ad440a9453def4af8bc73639e))
* **web:** add the public landing page and index it on search engines ([215d5f6](https://github.com/BrunoYTanaka/cruzadinha/commit/215d5f6a9af27ca833770071cc3b55e3f040cee0))
* **web:** add the public landing page and index it on search engines ([7f13af9](https://github.com/BrunoYTanaka/cruzadinha/commit/7f13af91d32c51cc29edf37099caa960dd268b36)), closes [#122](https://github.com/BrunoYTanaka/cruzadinha/issues/122)
* **web:** align the landing page to the mockup ([bdb2001](https://github.com/BrunoYTanaka/cruzadinha/commit/bdb20014b513df053950cb83a757488947e9fca7))
* **web:** align the landing page to the mockup ([b4ef401](https://github.com/BrunoYTanaka/cruzadinha/commit/b4ef401225e601ce0a2f848aa1862bae0218303a))
* **web:** mark wrong letters as typed and group helps in an Ajudas menu ([a956673](https://github.com/BrunoYTanaka/cruzadinha/commit/a9566737b6f434d489ff10dd0bb5a7a736e225c2))
* **web:** show the Turnstile challenge on sign-up and recovery ([86c04a2](https://github.com/BrunoYTanaka/cruzadinha/commit/86c04a25651a61106abeec156f1434dc9d68b9fc))


### Bug Fixes

* **web:** fewer notices and buttons on the calendar and the game ([ccea7ab](https://github.com/BrunoYTanaka/cruzadinha/commit/ccea7ab5f4efae85546c1286ed160fed8112824d))
* **web:** keep the helps button text centered ([17cb396](https://github.com/BrunoYTanaka/cruzadinha/commit/17cb3969ac6ba4ed10434bb901a6aad900e68b9f))
* **web:** preload landing fonts and retry the header calendar click ([4727556](https://github.com/BrunoYTanaka/cruzadinha/commit/47275566bd4e175a9ec1b576accadc4ffad949c7))
* **web:** remove the download-today button from the calendar ([648c3f4](https://github.com/BrunoYTanaka/cruzadinha/commit/648c3f4a2fce1e3a8dced3e2ffd4451a9ac37d07))
* **web:** stop showing the waiting-progress notice to guests ([eb9a3f3](https://github.com/BrunoYTanaka/cruzadinha/commit/eb9a3f384d9601c8fa894eecd8d3d1ad535c3417))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.27.0 to 0.28.0

## [0.12.1](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.12.0...web-v0.12.1) (2026-10-28)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.26.0 to 0.27.0

## [0.12.0](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.11.1...web-v0.12.0) (2026-10-28)


### Features

* add migration, stats, offline, account and draft mode ([ef68ded](https://github.com/BrunoYTanaka/cruzadinha/commit/ef68ded08307ee8a6c916f05b1663cdd04e7a53f))
* **web:** add draft layer rules to the game reducer ([ceca549](https://github.com/BrunoYTanaka/cruzadinha/commit/ceca5495bf6263d11f632646f850e097826b43f5))
* **web:** add the account page and e-mail confirmation ([5210d63](https://github.com/BrunoYTanaka/cruzadinha/commit/5210d63bd752ee297af0fb79f9f48e085f5ae31f))
* **web:** add the pencil and draft controls to the game screen ([4a42a80](https://github.com/BrunoYTanaka/cruzadinha/commit/4a42a80b1c4bcfd78e60c1161f5488cb053ec69a))
* **web:** keep drafts on the device and drop them with account data ([a4a78e6](https://github.com/BrunoYTanaka/cruzadinha/commit/a4a78e6dda520813c4f112393ddb0c41b038fe7b))
* **web:** keep puzzles and progress playable offline ([618738f](https://github.com/BrunoYTanaka/cruzadinha/commit/618738f405f08c673c108a4d0e7e4189af0daae6))


### Bug Fixes

* **web:** add a timeout to the proxy call to the API ([1747c87](https://github.com/BrunoYTanaka/cruzadinha/commit/1747c876740dba3989d38a0491154b5be71fa456))
* **web:** retry a progress save refused with 429 ([3f95e9a](https://github.com/BrunoYTanaka/cruzadinha/commit/3f95e9a195206b7666cca846a623e5ae53ae91f4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.25.0 to 0.26.0

## [0.11.1](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.11.0...web-v0.11.1) (2026-10-26)


### Bug Fixes

* **web:** ignore saves from a tab opened before playing again ([e6651ea](https://github.com/BrunoYTanaka/cruzadinha/commit/e6651eafdeaac78f28a1bfe66b42af3a611a8932))
* **web:** ignore saves from a tab opened before playing again ([58267b8](https://github.com/BrunoYTanaka/cruzadinha/commit/58267b875af1b84e31547189894dd30f7bf5dfa4)), closes [#86](https://github.com/BrunoYTanaka/cruzadinha/issues/86)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.24.0 to 0.25.0

## [0.11.0](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.10.0...web-v0.11.0) (2026-10-26)


### Features

* confirm the e-mail on sign-up and recover the password by e-mail ([fbd23d0](https://github.com/BrunoYTanaka/cruzadinha/commit/fbd23d06230d83165a27b866c98b445468ed49f6))
* **web:** add e-mail confirmation and password recovery screens ([af8d249](https://github.com/BrunoYTanaka/cruzadinha/commit/af8d2498d06e03a83594cc54c0a79705a56d9992))


### Bug Fixes

* **api:** drop the unused invites table and action ([1fa0f56](https://github.com/BrunoYTanaka/cruzadinha/commit/1fa0f566ba47fb3e4b8a3d5b7fad82bf4bbf1898))
* **api:** fix the audit findings (login limit, PROXY_SECRET, sessions and more) ([790ed08](https://github.com/BrunoYTanaka/cruzadinha/commit/790ed081c9cd47f9cc75a074c920174c71c0b520))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.23.0 to 0.24.0

## [0.10.0](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.9.3...web-v0.10.0) (2026-10-26)


### Features

* **web:** copy the clue on double click and close settings on outside click ([e885813](https://github.com/BrunoYTanaka/cruzadinha/commit/e8858135234f5ea2baf53c157e78067d64734c40))
* **web:** copy the clue on double click and close settings on outside click ([2e25b21](https://github.com/BrunoYTanaka/cruzadinha/commit/2e25b216bbabc2def55e21df8242a503241d19cc))


### Bug Fixes

* **web:** give the theme button e2e a viewport tall enough for the settings dialog ([4c6a719](https://github.com/BrunoYTanaka/cruzadinha/commit/4c6a7191cc22c859e3b804de989653981d56ffeb))
* **web:** give the theme button e2e a viewport tall enough for the settings dialog ([855fe6d](https://github.com/BrunoYTanaka/cruzadinha/commit/855fe6dac86412f5a3596623bce8e0415f3648d4))
* **web:** wait for the server before asking for the session ([ffd8977](https://github.com/BrunoYTanaka/cruzadinha/commit/ffd8977288cdf6cb8f3edfeee09f2c353d00b4ae))
* **web:** wait for the server before asking for the session ([f023198](https://github.com/BrunoYTanaka/cruzadinha/commit/f02319889c95e92cb5ee2c2991b5a8af9c775efb)), closes [#63](https://github.com/BrunoYTanaka/cruzadinha/issues/63)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.22.0 to 0.23.0

## [0.9.3](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.9.2...web-v0.9.3) (2026-10-23)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.21.0 to 0.22.0

## [0.9.2](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.9.1...web-v0.9.2) (2026-10-23)


### Bug Fixes

* **web:** reopen the calendar on the source of the game just left ([f5dd9c9](https://github.com/BrunoYTanaka/cruzadinha/commit/f5dd9c98481931ca78d02109f18b1d148fcfc617))
* **web:** reopen the calendar on the source of the game just left ([c062440](https://github.com/BrunoYTanaka/cruzadinha/commit/c062440ad2e4d3141eddc27fd87a3f6f91678a48)), closes [#71](https://github.com/BrunoYTanaka/cruzadinha/issues/71)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.20.0 to 0.21.0

## [0.9.1](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.9.0...web-v0.9.1) (2026-10-23)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.19.0 to 0.20.0

## [0.9.0](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.8.4...web-v0.9.0) (2026-10-23)


### Features

* add Cruzadas Clube as a puzzle source ([2ce8fc8](https://github.com/BrunoYTanaka/cruzadinha/commit/2ce8fc8fb793191e485518af1fc6019e73cfcb4b))
* **api:** add Cruzadas Brasil as a third puzzle source ([7f35376](https://github.com/BrunoYTanaka/cruzadinha/commit/7f35376cd0715e9156ceb6ea1f18dd1f0421cebb))
* **web:** draw bars between neighbouring words and show the clube source ([1bf4cc3](https://github.com/BrunoYTanaka/cruzadinha/commit/1bf4cc31cf7231d8ceedfadd841557d3e109c24e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.18.0 to 0.19.0

## [0.8.4](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.8.3...web-v0.8.4) (2026-10-22)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.17.0 to 0.18.0

## [0.8.3](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.8.2...web-v0.8.3) (2026-10-22)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.16.0 to 0.17.0

## [0.8.2](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.8.1...web-v0.8.2) (2026-10-22)


### Bug Fixes

* **web:** give full-page error screens a level-one heading ([2c8678c](https://github.com/BrunoYTanaka/cruzadinha/commit/2c8678cb05f0649da649238ad116758b7b109072))
* **web:** give full-page error screens a level-one heading ([cf32afd](https://github.com/BrunoYTanaka/cruzadinha/commit/cf32afda142680e415cb6a9f3c9c8b05fe4643a8)), closes [#46](https://github.com/BrunoYTanaka/cruzadinha/issues/46)
* **web:** keep the settings switch at 30 px and align the restore button ([bc58ede](https://github.com/BrunoYTanaka/cruzadinha/commit/bc58ede0d4333ae9c3943f3a9a8e159fde182bcd))
* **web:** keep the settings switch at 30 px and align the restore button ([1c164c0](https://github.com/BrunoYTanaka/cruzadinha/commit/1c164c031370e3f8fc6d242757d0ff742d6d5da6)), closes [#51](https://github.com/BrunoYTanaka/cruzadinha/issues/51)
* **web:** measure the tooltip again when its size changes ([b43b89f](https://github.com/BrunoYTanaka/cruzadinha/commit/b43b89f1bacc370da3af7d8f5dc6d409414bd236))
* **web:** measure the tooltip again when its size changes ([0e5517e](https://github.com/BrunoYTanaka/cruzadinha/commit/0e5517e90b647aca5cde9f27fc8ee00f4cd66f41))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.15.0 to 0.16.0

## [0.8.1](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.8.0...web-v0.8.1) (2026-10-22)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.14.0 to 0.15.0

## [0.8.0](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.7.2...web-v0.8.0) (2026-10-22)


### Features

* **web:** make buttons look like buttons and set them apart from links ([f79dc29](https://github.com/BrunoYTanaka/cruzadinha/commit/f79dc297ef46f5c24d03636a643fe07aa84e0646))
* **web:** make buttons look like buttons and set them apart from links ([9626471](https://github.com/BrunoYTanaka/cruzadinha/commit/96264719a4bd472abc7ed8c5c0ed849a0f1d15ba)), closes [#41](https://github.com/BrunoYTanaka/cruzadinha/issues/41)


### Bug Fixes

* **web:** fix layout and animation in settings, theme button and tooltips ([33f6d6f](https://github.com/BrunoYTanaka/cruzadinha/commit/33f6d6f4e023713ff6b1c8639d2638fa56a241d0))
* **web:** keep the theme button the same size in every state ([8fca325](https://github.com/BrunoYTanaka/cruzadinha/commit/8fca3253bf66b689d94f6771bda8d5411ab9247d))
* **web:** keep tooltips inside the window ([5673a6e](https://github.com/BrunoYTanaka/cruzadinha/commit/5673a6efdf37e5660f16d84a5c7a1d59e8b3f651))
* **web:** tidy the settings dialog layout and animate the default source ([1364a5b](https://github.com/BrunoYTanaka/cruzadinha/commit/1364a5beb7c1413fd5b0a3af57fdbec06b6954b5))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.13.0 to 0.14.0

## [0.7.2](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.7.1...web-v0.7.2) (2026-10-21)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.12.0 to 0.13.0

## [0.7.1](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.7.0...web-v0.7.1) (2026-10-21)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.11.0 to 0.12.0

## [0.7.0](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.6.0...web-v0.7.0) (2026-10-21)


### Features

* add user settings with theme, help limits and default source ([c7217b3](https://github.com/BrunoYTanaka/cruzadinha/commit/c7217b345685b7f74c019d7c27b2e01cb1b93354))
* **web:** add settings dialog with theme, help limits and default source ([1d1dee7](https://github.com/BrunoYTanaka/cruzadinha/commit/1d1dee7b73d7e69e8cfbc426519cab7e608bfaf0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.10.0 to 0.11.0

## [0.6.0](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.5.0...web-v0.6.0) (2026-10-20)


### Features

* **web:** centre clue bar text and move full clue above the bar ([a61c2b2](https://github.com/BrunoYTanaka/cruzadinha/commit/a61c2b2815866e56eeead78faf1221c8aad593ea))
* **web:** centre clue bar text, show full clue above the bar, strike solved clues ([4ff4d43](https://github.com/BrunoYTanaka/cruzadinha/commit/4ff4d43d1b74e43eb70d6801e17aab22c79ca372))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.9.0 to 0.10.0

## [0.5.0](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.4.1...web-v0.5.0) (2026-10-20)


### Features

* **web:** game screen without layout shift ([786c61b](https://github.com/BrunoYTanaka/cruzadinha/commit/786c61b4d03d803283c4f379c734076511d03307))
* **web:** keep the active clue bar on one line ([2dbcd82](https://github.com/BrunoYTanaka/cruzadinha/commit/2dbcd8298898771777409191cdb65e2a1d7b71b2))
* **web:** keep the clue bar as wide as the board ([7e428c8](https://github.com/BrunoYTanaka/cruzadinha/commit/7e428c801aab93db4818f6e6165f432ae6b6355e))
* **web:** keep the clue bar as wide as the board and show the full clue on hover ([ff5dc39](https://github.com/BrunoYTanaka/cruzadinha/commit/ff5dc39a7375e7738c5b34d20db24306ad1c5edd))
* **web:** mark a solved clue with a success background and a check ([46aae34](https://github.com/BrunoYTanaka/cruzadinha/commit/46aae34cc7b6c2f3f73b7abbc101ef63cc3b1cea))
* **web:** show the full clue when hovering a cut clue ([447f002](https://github.com/BrunoYTanaka/cruzadinha/commit/447f0026bdb6e9adb7633bc3f16f1090b80fe408))
* **web:** stop showing the save state while it works ([ea90f07](https://github.com/BrunoYTanaka/cruzadinha/commit/ea90f07b132fa910e4c3cfd23df58b4dcb2ed745))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.8.0 to 0.9.0

## [0.4.1](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.4.0...web-v0.4.1) (2026-10-19)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.7.0 to 0.8.0

## [0.4.0](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.3.0...web-v0.4.0) (2026-10-19)


### Features

* **web:** keep the game title short so the toolbar fits one line ([194ce17](https://github.com/BrunoYTanaka/cruzadinha/commit/194ce174c40e4fa7a3796859be8f96caf59fc8b0))
* **web:** make every puzzle source visible and playable from the library ([32f5253](https://github.com/BrunoYTanaka/cruzadinha/commit/32f5253debf7cdc2cb8992fb87a5d2c86e9c173b))
* **web:** show the puzzle source in the game and offer the other source on completion ([a535296](https://github.com/BrunoYTanaka/cruzadinha/commit/a535296609517010c00b59a2c1bd5af4b7f3ae85))
* **web:** show today's puzzle of every source on the library ([ec31ba4](https://github.com/BrunoYTanaka/cruzadinha/commit/ec31ba483f768ade69f3ff4181eef2a8019aee5f))
* **web:** switch the calendar source with accessible tabs ([455bb25](https://github.com/BrunoYTanaka/cruzadinha/commit/455bb25c4fa217dc245baaa9a5cc8f793428334d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.6.0 to 0.7.0

## [0.3.0](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.2.3...web-v0.3.0) (2026-10-17)


### Features

* add guest play and open sign-up behind a flag ([9f8c873](https://github.com/BrunoYTanaka/cruzadinha/commit/9f8c873cd9b338d7ccde0f1cf646c6f8affb7160))
* add guest play and open sign-up behind a flag ([d308ef0](https://github.com/BrunoYTanaka/cruzadinha/commit/d308ef0cc70dfde2cc54a2473a95705adf645cab))
* add the Cruzada Online puzzle source ([392dfd1](https://github.com/BrunoYTanaka/cruzadinha/commit/392dfd1a8705cce09416256c104fd986746b58ef))
* **api:** add the cruzadaonline puzzle source ([3de5272](https://github.com/BrunoYTanaka/cruzadinha/commit/3de52728570c6c90f62bb11bdecb99240046df4c))
* deploy to production with versioned releases (feature 012) ([#15](https://github.com/BrunoYTanaka/cruzadinha/issues/15)) ([7edece9](https://github.com/BrunoYTanaka/cruzadinha/commit/7edece9e1cf78f93a72e873a7e571f3a6240a23b))
* **web:** let players choose the puzzle source ([1a1b31e](https://github.com/BrunoYTanaka/cruzadinha/commit/1a1b31e3eae5a60a759035b9c1142097f6e21361))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.5.0 to 0.6.0

## [0.2.3](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.2.2...web-v0.2.3) (2026-10-17)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.4.0 to 0.5.0

## [0.2.2](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.2.1...web-v0.2.2) (2026-10-16)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.3.0 to 0.4.0

## [0.2.1](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.2.0...web-v0.2.1) (2026-10-16)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.2.0 to 0.3.0

## [0.2.0](https://github.com/BrunoYTanaka/cruzadinha/compare/web-v0.1.0...web-v0.2.0) (2026-10-16)


### Features

* deploy to production with versioned releases (feature 012) ([#15](https://github.com/BrunoYTanaka/cruzadinha/issues/15)) ([7edece9](https://github.com/BrunoYTanaka/cruzadinha/commit/7edece9e1cf78f93a72e873a7e571f3a6240a23b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from * to 0.2.0
