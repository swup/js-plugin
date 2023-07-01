# Swup JS Plugin

A [swup](https://swup.js.org) plugin for managing transitions in JS.

- Use JavaScript for timing and animations instead of CSS
- Successor to the deprecated [swupjs](https://github.com/swup/swupjs) library

## Installation

Install the plugin from npm and import it into your bundle.

```bash
npm install @swup/js-plugin
```

```js
import SwupJsPlugin from '@swup/js-plugin';
```

Or include the minified production file from a CDN:

```html
<script src="https://unpkg.com/@swup/js-plugin@3"></script>
```

## Usage

To run this plugin, include an instance in the swup options.

```js
const swup = new Swup({
  plugins: [
    new SwupJsPlugin({ animations: [ /* your custom animation functions */ ] })
  ]
});
```

## Options

The plugin expects an `array` of animation objects.
The example below is the default setup and defines two animations, where `out` is the
animation function being executed before the content is being replaced, and `in` is
the animation being executed after the content is replaced:

```js
{
  animations: [
    {
      from: '(.*)', // matches any route
      to: '(.*)', // matches any route
      out: done => done(), // immediately continues
      in: done => done() // immediately continues
    }
  ]
}
```

This is also the animation object that swup will fall-back to in case no other matching
animation object is found.

Animations are chosen based on the `from` and `to` properties of the object, which are
compared against the current page transition (urls of current and next page).
Learn more on [choosing the animation](#choosing-the-animation) below.

## Animation function

The animation function receives two parameters: a `done` function and a data object.

### `done()` function

The `done()` function must be called once and serves as an indicator that the animation
is done and swup can proceed with replacing the content.
In a real world example, `done()` would be used as a callback of the animation library.
By default no animation is being executed and `done()` is called right away.

In the example below, the `done` function is called after two seconds,
which means that swup would wait at least two seconds (or any time necessary
to load the new page content), before continuing to replace the content.

```js
out: (done) => {
  setTimeout(done, 2000);
}
```

### Data object

The second parameter is an object that contains some useful data, like the transition
object (containing actual before/after routes), the `from` and `to` parameters of the
animation object, and the result of executing the Regex with the routes (`array`).

```js
{
  context: { /* */ }, // swup global context object
  direction: 'in',
  from: {
    url: '/',
    pattern: '(.*)',
    params: {}
  },
  to: {
    url: '/about',
    pattern: '(.*)',
    params: {}
  }
}
```

## Example

Basic usage with animation libraries looks like this:

### GSAP

```js
{
  from: '(.*)',
  to: '(.*)',
  in: (done) => {
    const container = document.querySelector('#swup');
    container.style.opacity = 0;
    gsap.to(container, { opacity: 1, duration: 0.5, onComplete: done });
  },
  out: (done) => {
    const container = document.querySelector('#swup');
    container.style.opacity = 1;
    gsap.to(container, { opacity: 0, duration: 0.5, onComplete: done });
  }
}
```

### anime.js

```js
{
  from: '(.*)',
  to: '(.*)',
  in: (done) => {
    const container = document.querySelector('#swup');
    container.style.opacity = 0;
    anime({ targets: container, opacity: 1, duration: 500, complete: done });
  },
  out: (done) => {
    const container = document.querySelector('#swup');
    container.style.opacity = 1;
    anime({ targets: container, opacity: 0, duration: 500, complete: done });
  }
}
```

## Choosing the animation

As mentioned above, the animation is chosen based on the `from` and `to` properties of the animation object.
Those properties can take several forms:

- a string (matching a route exactly)
- a regular expression
- A route pattern like `/foo/:bar`) parsed by [path-to-regexp](https://github.com/pillarjs/path-to-regexp)
- a custom transition name taken from the `data-swup-transition` attribute of the clicked link

The most fitting route is always chosen.
Keep in mind, that two routes can be evaluated as "same fit".
In this case, the later one defined in the options is used, so usually you would like to define the more specific routes later.
See the example below for more info.

```js
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
