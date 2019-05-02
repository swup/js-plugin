# Swup JS plugin (swupjs)

## Instalation

This plugin can be installed with npm

```bash
npm install @swup/js-plugin
```

and included with import

```shell
import SwupJsPlugin from '@swup/js-plugin';
```

or included from the dist folder

```html
<script src="./dist/SwupJsPlugin.js"></script>
```

## Usage

To run this plugin, include an instance in the swup options.

```javascript
const swup = new Swup({
  plugins: [new SwupJsPlugin()]
});
```
