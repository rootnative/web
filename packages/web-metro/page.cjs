// The web page of the app: on the dev server of `withRootNative`, and in `rootnative-web build`.

const { readFileSync } = require('node:fs')
const { join } = require('node:path')

// The address of the dev bundle. `react-native start` builds it from the entry `index`, which is
// `index.web.js` on the web when the app has one.
const DEV_BUNDLE = '/index.bundle?platform=web&dev=true&minify=false'

const escapeHTML = (text) => text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`)

const appTitle = (projectRoot) => {
  try {
    const app = JSON.parse(readFileSync(join(projectRoot, 'app.json'), 'utf8'))
    return String(app.displayName ?? app.name ?? 'React Native')
  } catch {
    return 'React Native'
  }
}

// A root that fills the window, as on iOS and Android, and the bundle at the end of the body.
const pageHTML = (title, bundle) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHTML(title)}</title>
    <style>
      html, body, #root { height: 100%; margin: 0 }
      #root { display: flex; flex-direction: column }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="${escapeHTML(bundle)}"></script>
  </body>
</html>
`

module.exports = { DEV_BUNDLE, appTitle, pageHTML }
