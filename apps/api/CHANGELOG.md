# Changelog

## [0.9.0](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.8.1...api-v0.9.0) (2026-10-29)


### Features

* add turnstile captcha to sign-up and password recovery ([71515ed](https://github.com/BrunoYTanaka/cruzadinha/commit/71515ed12cf9a1cb8d4d3b206b32f87dd219ea1e))
* **api:** verify a Turnstile proof on the e-mail routes ([6c7564d](https://github.com/BrunoYTanaka/cruzadinha/commit/6c7564d6d9bd938f3bff7dbc81959d87c9f5afd4))
* optional automatic verification ([2262f14](https://github.com/BrunoYTanaka/cruzadinha/commit/2262f149825724a6dcaa8f498a53e66667bfda1c))
* **shared:** add verifyOnType setting ([760f83e](https://github.com/BrunoYTanaka/cruzadinha/commit/760f83ec62c4e02044b65e88c69370d0d717c2a3))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.27.0 to 0.28.0

## [0.8.1](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.8.0...api-v0.8.1) (2026-10-28)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.26.0 to 0.27.0

## [0.8.0](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.7.1...api-v0.8.0) (2026-10-28)


### Features

* add migration, stats, offline, account and draft mode ([ef68ded](https://github.com/BrunoYTanaka/cruzadinha/commit/ef68ded08307ee8a6c916f05b1663cdd04e7a53f))
* **api:** add account management routes and email change ([7a2ddc3](https://github.com/BrunoYTanaka/cruzadinha/commit/7a2ddc3ef4d9e92911368b262a3d683a2b8b2d90))


### Bug Fixes

* **api:** delete old rate-limit attempts and report the failing edition ([890d958](https://github.com/BrunoYTanaka/cruzadinha/commit/890d958523c98ef16213cfc79948413239c8a1da))
* **api:** limit progress writes per user and reserve the e-mail ceiling ([2019dfb](https://github.com/BrunoYTanaka/cruzadinha/commit/2019dfbfbc7e2a7d1e4e0aa616b65dc82ea1a53f))
* **api:** limit source fetches to the library window and count IPv6 by /64 ([ebfb617](https://github.com/BrunoYTanaka/cruzadinha/commit/ebfb6177e5692c8ed36300d5d286c3343536d31d))
* **api:** reserve address limits atomically and log collect errors ([126a45f](https://github.com/BrunoYTanaka/cruzadinha/commit/126a45f7f6e2cd806a5f1f4a1de9a37daf4694b6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.25.0 to 0.26.0

## [0.7.1](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.7.0...api-v0.7.1) (2026-10-26)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.24.0 to 0.25.0

## [0.7.0](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.6.0...api-v0.7.0) (2026-10-26)


### Features

* **api:** confirm the e-mail on sign-up and recover the password by e-mail ([4c6bb6b](https://github.com/BrunoYTanaka/cruzadinha/commit/4c6bb6b64cdb1dcc395a2ff2412a16f86f0e3dbd))
* confirm the e-mail on sign-up and recover the password by e-mail ([fbd23d0](https://github.com/BrunoYTanaka/cruzadinha/commit/fbd23d06230d83165a27b866c98b445468ed49f6))


### Bug Fixes

* **api:** delete expired and ended sessions during puzzles collect ([a9f2bf2](https://github.com/BrunoYTanaka/cruzadinha/commit/a9f2bf213855946aab580d5a9cf410ebd483963f))
* **api:** drop the unused invites table and action ([1fa0f56](https://github.com/BrunoYTanaka/cruzadinha/commit/1fa0f566ba47fb3e4b8a3d5b7fad82bf4bbf1898))
* **api:** fix the audit findings (login limit, PROXY_SECRET, sessions and more) ([790ed08](https://github.com/BrunoYTanaka/cruzadinha/commit/790ed081c9cd47f9cc75a074c920174c71c0b520))
* **api:** refuse to start in production without PROXY_SECRET ([6961a97](https://github.com/BrunoYTanaka/cruzadinha/commit/6961a978934bf86696d8ee095f8c15c377add922))
* **api:** reserve the login attempt before checking the password ([30df1ef](https://github.com/BrunoYTanaka/cruzadinha/commit/30df1eff4532cfdee65940334495b9f08ed6bd04))
* **api:** stop reading a source body once it passes the size limit ([f265fb0](https://github.com/BrunoYTanaka/cruzadinha/commit/f265fb0d982414dbebecd568988d35017043118e))


### Performance Improvements

* **api:** read only the grid when saving progress ([f36bcba](https://github.com/BrunoYTanaka/cruzadinha/commit/f36bcbaabd22550b0711b1ce4bd91d07b6bb6a6d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cruzadinha/shared bumped from 0.23.0 to 0.24.0

## [0.6.0](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.5.3...api-v0.6.0) (2026-10-26)

### Features

- **shared:** add copyClue setting ([8bdd09b](https://github.com/BrunoYTanaka/cruzadinha/commit/8bdd09be6352254658a090890cf12553d3ef21e0))
- **web:** copy the clue on double click and close settings on outside click ([e885813](https://github.com/BrunoYTanaka/cruzadinha/commit/e8858135234f5ea2baf53c157e78067d64734c40))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.22.0 to 0.23.0

## [0.5.3](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.5.2...api-v0.5.3) (2026-10-23)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.21.0 to 0.22.0

## [0.5.2](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.5.1...api-v0.5.2) (2026-10-23)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.20.0 to 0.21.0

## [0.5.1](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.5.0...api-v0.5.1) (2026-10-23)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.19.0 to 0.20.0

## [0.5.0](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.4.7...api-v0.5.0) (2026-10-23)

### Features

- add Cruzadas Clube as a puzzle source ([2ce8fc8](https://github.com/BrunoYTanaka/cruzadinha/commit/2ce8fc8fb793191e485518af1fc6019e73cfcb4b))
- **api:** add Cruzadas Brasil as a third puzzle source ([7f35376](https://github.com/BrunoYTanaka/cruzadinha/commit/7f35376cd0715e9156ceb6ea1f18dd1f0421cebb))
- **api:** add Cruzadas Brasil as a third puzzle source ([191fb57](https://github.com/BrunoYTanaka/cruzadinha/commit/191fb574679a1bb8d0c61d22bc6f06a79d9fd545))
- **api:** add the Cruzadas Clube source with a sandboxed script reader ([5c70157](https://github.com/BrunoYTanaka/cruzadinha/commit/5c70157031940ce129030e6fd411ceeb56177932))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.18.0 to 0.19.0

## [0.4.7](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.4.6...api-v0.4.7) (2026-10-22)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.17.0 to 0.18.0

## [0.4.6](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.4.5...api-v0.4.6) (2026-10-22)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.16.0 to 0.17.0

## [0.4.5](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.4.4...api-v0.4.5) (2026-10-22)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.15.0 to 0.16.0

## [0.4.4](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.4.3...api-v0.4.4) (2026-10-22)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.14.0 to 0.15.0

## [0.4.3](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.4.2...api-v0.4.3) (2026-10-22)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.13.0 to 0.14.0

## [0.4.2](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.4.1...api-v0.4.2) (2026-10-21)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.12.0 to 0.13.0

## [0.4.1](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.4.0...api-v0.4.1) (2026-10-21)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.11.0 to 0.12.0

## [0.4.0](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.3.4...api-v0.4.0) (2026-10-21)

### Features

- add user settings with theme, help limits and default source ([c7217b3](https://github.com/BrunoYTanaka/cruzadinha/commit/c7217b345685b7f74c019d7c27b2e01cb1b93354))
- **api:** store user settings per account ([3776e40](https://github.com/BrunoYTanaka/cruzadinha/commit/3776e40b786a08e8ee41512dc17e6cdc0fd39236))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.10.0 to 0.11.0

## [0.3.4](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.3.3...api-v0.3.4) (2026-10-20)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.9.0 to 0.10.0

## [0.3.3](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.3.2...api-v0.3.3) (2026-10-20)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.8.0 to 0.9.0

## [0.3.2](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.3.1...api-v0.3.2) (2026-10-19)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.7.0 to 0.8.0

## [0.3.1](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.3.0...api-v0.3.1) (2026-10-19)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.6.0 to 0.7.0

## [0.3.0](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.2.3...api-v0.3.0) (2026-10-17)

### Features

- add guest play and open sign-up behind a flag ([9f8c873](https://github.com/BrunoYTanaka/cruzadinha/commit/9f8c873cd9b338d7ccde0f1cf646c6f8affb7160))
- add guest play and open sign-up behind a flag ([d308ef0](https://github.com/BrunoYTanaka/cruzadinha/commit/d308ef0cc70dfde2cc54a2473a95705adf645cab))
- add the Cruzada Online puzzle source ([392dfd1](https://github.com/BrunoYTanaka/cruzadinha/commit/392dfd1a8705cce09416256c104fd986746b58ef))
- **api:** add the cruzadaonline puzzle source ([3de5272](https://github.com/BrunoYTanaka/cruzadinha/commit/3de52728570c6c90f62bb11bdecb99240046df4c))
- deploy to production with versioned releases (feature 012) ([#15](https://github.com/BrunoYTanaka/cruzadinha/issues/15)) ([7edece9](https://github.com/BrunoYTanaka/cruzadinha/commit/7edece9e1cf78f93a72e873a7e571f3a6240a23b))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.5.0 to 0.6.0

## [0.2.3](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.2.2...api-v0.2.3) (2026-10-17)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.4.0 to 0.5.0

## [0.2.2](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.2.1...api-v0.2.2) (2026-10-16)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.3.0 to 0.4.0

## [0.2.1](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.2.0...api-v0.2.1) (2026-10-16)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from 0.2.0 to 0.3.0

## [0.2.0](https://github.com/BrunoYTanaka/cruzadinha/compare/api-v0.1.0...api-v0.2.0) (2026-10-16)

### Features

- deploy to production with versioned releases (feature 012) ([#15](https://github.com/BrunoYTanaka/cruzadinha/issues/15)) ([7edece9](https://github.com/BrunoYTanaka/cruzadinha/commit/7edece9e1cf78f93a72e873a7e571f3a6240a23b))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @cruzadinha/shared bumped from * to 0.2.0
