# Change Log

All notable changes to the "rica-developerui" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Initial release

## [0.0.3]

- Included runtime parser dependencies in the VSIX package so the extension can activate after installation.

## [0.0.2]

- Added explicit command activation events so Command Palette actions register reliably after VSIX installation.
- Fixed VSIX packaging rules so runtime JavaScript files are included.
