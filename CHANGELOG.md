# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-01-08

### Added
- PWA update notification banner with "Update Now" button
- `useAppUpdate` composable for service worker update detection
- Proper service worker lifecycle handling using VitePWA's prompt mode

### Changed
- PWA registration type changed from `autoUpdate` to `prompt` for user-controlled updates
- Update checks now occur on app start and every 12 hours (instead of silently in background)

### Technical
- Uses VitePWA's `useRegisterSW` for proper service worker lifecycle integration
- Implements `registration.update()` for explicit update checks
- `skipWaiting` pattern ensures new service worker takes control before page reload

## [0.3.0] - 2026-01-07

### Added
- README.md with setup instructions, project structure, and translation workflow documentation
- CHANGELOG.md to track version history
- Cancel recording button (X icon) positioned bottom-left of record button
- UI translations for `micDenied` and `noSpeechRecognition` across all 35+ supported languages
- Dynamic version display pulled from package.json via Vite define

### Changed
- Refactored CSS from desktop-first to mobile-first approach
  - Base styles now target smallest screens (480px)
  - `min-width` media queries for tablet (481px+) and desktop (769px+)
- Conversation layout now flows top-to-bottom instead of bottom-to-top
- Header height reduced to 60px
- Header styling updated to match footer (shadow, background color)
- Scroll behavior renamed from `scrollToTop` to `scrollToLatest`

### Fixed
- GSAP Draggable import casing error causing TypeScript build failure
- Canvas dimensions now initialize on mount to prevent bottom distance "jumping"

## [0.2.4] - 2026-01-06

### Added
- Version badge display in header

### Fixed
- Various CSS improvements

## [0.2.3] - 2026-01-06

### Added
- Google Text-to-Speech integration via local API proxy

### Fixed
- CSS styling issues

## [0.2.0] - 2026-01-05

### Added
- AGENTS.md for AI assistant context

### Fixed
- Environment variable access

## [0.1.0] - 2026-01-05

### Added
- Initial release
- Voice recording with real-time visualization
- Voxtral transcription and translation
- Browser Text-to-Speech playback
- Conversation history with IndexedDB persistence
- PWA support
- 35+ language support
