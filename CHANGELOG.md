# Changelog

## [0.5.0](https://github.com/bloodworks-io/phlox/compare/v0.4.1...v0.5.0) (2025-04-24)


### Features

* Clean repetitive text that Whisper produces occasionally ([00edf57](https://github.com/bloodworks-io/phlox/commit/00edf57de7630485f5350b1cd67223efa2a138bb))
* Improved readability of settings panel text-areas ([f605140](https://github.com/bloodworks-io/phlox/commit/f605140c9f10b2cbd0660a8267368faa4adeb494))
* include a style example field for the LLM to better adhere to user's note format ([e9370ea](https://github.com/bloodworks-io/phlox/commit/e9370ea7c94b072db174ffb75a42fbae8f57fa2c))


### Bug Fixes

* better reliability by passing user query direct to transcript tool ([089df73](https://github.com/bloodworks-io/phlox/commit/089df732c55ffd47f4e1725af0654c9246b12475))
* document processing/OCR now works correctly with templates and adheres to style examples ([f3ce332](https://github.com/bloodworks-io/phlox/commit/f3ce3323633039c1c3ed77684399b0c4cc7c0831))
* removed redundant fields in default templates ([c15165e](https://github.com/bloodworks-io/phlox/commit/c15165e67239e90389e0d45f91a91f2eb5ea9a84))
* revert to verbose_json for Whisper call ([ae11eca](https://github.com/bloodworks-io/phlox/commit/ae11eca49f6fe47fc1eb036ed1cb8662afcb6c9b))
* Squashed more bugs in template generation from user-defined note ([e315457](https://github.com/bloodworks-io/phlox/commit/e3154572ad625b4800fb03658910ee7cce994f99))
* Template delete function now works ([f605140](https://github.com/bloodworks-io/phlox/commit/f605140c9f10b2cbd0660a8267368faa4adeb494))

## [0.4.1](https://github.com/bloodworks-io/phlox/compare/v0.4.0...v0.4.1) (2025-03-14)


### Bug Fixes

* Version not appearing in sidebar ([1cdd9ad](https://github.com/bloodworks-io/phlox/commit/1cdd9ad769d776e25098ec32bf54a71c4652b768))

## [0.4.0](https://github.com/bloodworks-io/phlox/compare/v0.4.0-pre...v0.4.0) (2025-03-14)


### Bug Fixes

* Changelog view now works in version info panel ([afff5f1](https://github.com/bloodworks-io/phlox/commit/afff5f1fc2628d69595b4e45d41010e9ef4b08f5))
* server.py ([12e5fd8](https://github.com/bloodworks-io/phlox/commit/12e5fd8fd0c22348ebf75a8740175e08d0aeb7f4))


### Miscellaneous Chores

* remove -pre suffix from versioning ([afff5f1](https://github.com/bloodworks-io/phlox/commit/afff5f1fc2628d69595b4e45d41010e9ef4b08f5))

## [0.4.0-pre](https://github.com/bloodworks-io/phlox/compare/v0.3.1-pre...v0.4.0-pre) (2025-03-14)


### ✨ Features

* ✅ Add transcription view and document processing ([5d76614](https://github.com/bloodworks-io/phlox/commit/5d76614b6a58f4162b1aafc2d070d02896405a37))
  * 🎙️ Initial transcription view with improved UI
  * 🔄 Refactored transcription calls to a separate module
  * 🛠️ Added error handling for failed transcription
  * 🤖 New LLM tool for providing direct information from transcripts
  * 💬 Updated Quick Chat appearance with new settings panel
  * 📝 Refined document upload interface
  * 📊 Added version info view and changelog workflow
