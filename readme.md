# Swup JS Plugin (formerly `swupjs`)

JS Plugin enables the use of JavaScript for timing and animations in [Swup](https://swup.js.org) page transitions.

This plugin is the successor of the deprecated [swupjs](https://github.com/swup/swupjs) package, with similar but improved functionality.

## Installation

This plugin can be installed with npm

```bash
npm install @swup/js-plugin
```

and included with an import

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
  plugins: [new SwupJsPlugin([
    // your custom transition objects
  ])]
});
```

## Options

The plugin expects a single argument in the form of an `array` of animation objects.
The example below is the default setup and defines two animations,
where `out` is the animation (function) being executed before the content is being replaced, and `in` is the animation being executed after the content is replaced.
This is also the animation object that swup will fall-back to in case no other fitting animation object is found.

Animations are chosen based on the `from` and `to` properties of the object, which are compared against the current transition (routes of current and next page).
More on that [here](#choosing-the-animation).

```javascript
const options = [
  {
    from: '(.*)', // meaning any
    to: '(.*)', // meaning any
    out: next => next(),
    in: next => next()
  }
];
```

## Animation Function

The animation function receives two parameters: 
- The `next()` function 
- an object that contains information about the current animation.

The `next()` function must be called once and serves as an indicator that the animation is done and swup can proceed with replacing the content.
In a real world example, `next()` would be called as a callback of the animation.
By default no animation is being executed and `next()` is called right away.

The second parameter is an object that contains some useful data, like the transition object (containing actual before/after routes), the `from` and `to` parameters of the animation object, and the result of executing the Regex with the routes (`array`).

In the example below, the `next` function is called after two seconds,
which means that swup would wait at least two seconds (or any time necessary to load the new page content),
before continuing to replacing the content.

```javascript
///...
out: (next) => {
  setTimeout(next, 2000);
};
// ...
```

Basic usage with tools like [GSAP](https://greensock.com/gsap/) would look something like this:

```javascript
const options = [
  {
    from: '(.*)',
    to: '(.*)',
    in: (next, infos) => {
      document.querySelector('#swup').style.opacity = 0;
      gsap.to(document.querySelector('#swup'), {
        duration: 0.5,
        opacity: 1,
        onComplete: next
      });
    },
    out: (next, infos) => {
      document.querySelector('#swup').style.opacity = 1;
      gsap.to(document.querySelector('#swup'), 0.5, {
        duration: 0.5,
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

As mentioned above, the animation is chosen based on the `from` and `to` properties of the animation object.
Those properties can take several forms:

- A String (matching a route exactly).
- A Regex.
- A Path route definition which you may know from things like [Express](https://expressjs.com/) (eg. `/foo/:bar`). The [Path-to-RegExp](https://github.com/pillarjs/path-to-regexp) library is used for this purpose, so refer to their documentation.
- A String of custom transitions (taken from the `data-swup-transition` attribute of the clicked link).

The most fitting route is always chosen.
Keep in mind, that two routes can be evaluated as "same fit".
In this case, the later one defined in the options is used, so usually you would like to define the more specific routes later.
See the example below for more info.

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
