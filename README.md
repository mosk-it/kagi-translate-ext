# Kagi Translate Extension (Unofficial)

Extensions for firefox and chrome that translate selected text using translate.kagi.com service.

## Installation

The extension is currently under review for listing on addons.mozilla.org.
Due to the required $5 fee for publishing on the Chrome Web Store, there are no current plans to list the extension there.
Currently, the extension can only be installed in debug mode.

1. There are two extensions in dist folder, to install it in debug mode - `about:debugging` in firefox and `chrome://extensions` with developer mode in chrome
2. After installation go to options of the extension and enter your Kagi Authorization Token (it might work without it, but there is some limit quota) and select languages you want to use.

![](./images/screen-010.png)
![](./images/screen-030.png)

## Building

`make` will create extension in `./dist` folder (it's already builded and included in repo tho)

### requires installed npm

```
make firefox
make chrome
```

### with docker

```
make firefox_docker
make chrome_docker
```



## Permissions

This addon uses following permissions:

- `activeTab`, `scripting` - on active tab get selected text and put it in popup's textarea to translate
- `storage` - keep settings
- `cookies` - use to auth with translate.kagi.com


## TODO

- [ ] Look into streaming the response to reduce display latency and perceived lag.


## Note
This is an unofficial extension and is not affiliated with Kagi.
