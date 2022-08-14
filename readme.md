# Swup JS Plugin (formerly `swupjs`)

Plugin modifies swup for use with JavaScript animations. Timing and animations are based on JavaScript, not CSS transitions.

Plugin provides similar but improved functionality as the deprecated [swupjs](https://github.com/swup/swupjs) package.

## Installation

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

## Options

Plugin options is an an array of animation objects.
The example below is the default setup and defines two animations,
where `out` is the animation (function) being executed before content replace, and `in` is animation being executed after the content is replaced.
This is also an animation object that swup will fallback to in case no other fitting animation object is found.

Animations are chosen based on the `from` and `to` properties of the object, which are compared against current transition (routes of current and next page).
More on that [here](#choosing-the-animation).

```javascript
const options = [
  {
    from: '(.*)', // meaning any
    to: '(.*)', // meaning any
    out: (next) => next(),
    in: (next) => next()
  }
];
```

## Animation Function

Animation function receives two parameter, `next` function and additional parameters.
Call of `next` function serves as an indicator, that animation is done and must be called once.
In a real world example, `next()` would be called as a callback of the animation.
By default no animation is being executed and next() is called right away.

Additional parameters include some useful data, like transition object (containing actual before/after routes), `from` and `to` parameters of animation object, and the result of executing the Regex with the routes (array).

In the example below, next function is called after two seconds,
which means that swup would wait two seconds (or any time necessary for the load of the new page content),
before continuing to the content replace.

```javascript
///...
out: (next) => {
  setTimeout(next, 2000);
};
// ...
```

Basic usage with tools like GSAP would look something like the following:

```javascript
const options = [
  {
    from: '(.*)',
    to: '(.*)',
    in: function(next) {
      document.querySelector('#swup').style.opacity = 0;
      TweenLite.to(document.querySelector('#swup'), 0.5, {
        opacity: 1,
        onComplete: next
      });
    },
    out: (next) => {
      document.querySelector('#swup').style.opacity = 1;
      TweenLite.to(document.querySelector('#swup'), 0.5, {
        opacity: 0,
        onComplete: next
      });
    }
  }
];

const swup = new Swup({
  plugins: [new SwupJsPlugin(options)]
});
```

## Choosing the animation

As mentioned, animation is chosen based on the `from` and `to` properties of the animation object.
Those properties can take several forms:

- String (matching a route exactly).
- Regex.
- Path route definition which you may know from things like [Express](https://expressjs.com/) (eg. `/foo/:bar`). [Path-to-RegExp](https://github.com/pillarjs/path-to-regexp) library is used for this purpose, so refer to their documentation.
- String of custom transition (taken from `data-swup-transition` attribute of the clicked link).

Most fitting route is always chosen.
Keep in mind, that two routes can be evaluated as "same fit".
In such case, the later one defined in the options is used, so usually you would like to define more specific route later.
See example below for more info.

```javascript
[
  // animation 1
  { from: '(.*)', to: '(.*)' },

  // animation 2
  { from: '/', to: /pos(.*)/ },

  // animation 3
  { from: '/', to: '/post/:id' },

  // animation 4
  { from: '/', to: '/post' },

  // animation 5
  { from: '/', to: 'custom-transition' }
];
```

- from `/` to `/post` → animation **4**
- from `/` to `/posting` → animation **2**
- from `/` to `/post/12` → animation **3**
- from `/` to `/some-route` → animation **1**
- from `/` to `/post` with click having `data-swup-transition="custom-transition"` → animation **5**
