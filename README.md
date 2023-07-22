# Swup JS Plugin

A [swup](https://swup.js.org) plugin for managing animations in JS.

- Use JavaScript for timing animations instead of CSS
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

This is also the fallback animation in case no other matching animations were found.

Animations are chosen based on the `from` and `to` properties of the object, which are
compared against the current visit (urls of current and next page).
Learn more on [choosing the animation](#choosing-the-animation) below.

## Animation function

The animation function is executed for each corresponding animation phase. Inside the animation
function, you manage the animation yourself and signal when it has finished. It receives two
arguments: a `done` function and a `data` object.

```js
out: (done, data) => {
  // Signal the end of the animation by calling done()
  // Access info about the animation inside the data argument
}
```

### Signaling the end of an animation

Calling the `done()` function signals to swup that the animation has finished and it can proceed
to the next step: replacing the content or finishing the visit. You can pass along the `done()`
function as a callback to your animation library. The example below will wait for two seconds before replacing the content.

```js
out: (done) => {
  setTimeout(done, 2000);
}
```

#### Promises and async/await

If your animation library returns Promises, you can also return the Promise directly from your
animation function. Swup will consider the animation to be finished when the Promise resolves.
The `done` function is then no longer required.

```js
out: () => {
  return myAnimationLibrary.animate(/* */).then(() => {});
}
```

This also allows `async/await` syntax for convenience.

```js
out: async () => {
  await myAnimationLibrary.animate(/* */);
}
```

### Data object

The second parameter is an object that contains useful data about the animation, such as the visit
object (containing actual before/after routes), the `from` and `to` parameters of the
animation object, and the route params.

```js
{
  visit: { /* */ }, // swup global visit object
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

## Examples

Basic usage examples for a fade transition implemented in popular animation libraries:

### [GSAP](https://greensock.com/gsap/)

```js
{
  from: '(.*)',
  to: '(.*)',
  out: (done) => {
    const container = document.querySelector('#swup');
    container.style.opacity = 1;
    gsap.to(container, { opacity: 0, duration: 0.5, onComplete: done });
  },
  in: (done) => {
    const container = document.querySelector('#swup');
    container.style.opacity = 0;
    gsap.to(container, { opacity: 1, duration: 0.5, onComplete: done });
  }
}
```

### [anime.js](https://animejs.com/)

```js
{
  from: '(.*)',
  to: '(.*)',
  out: (done) => {
    const container = document.querySelector('#swup');
    container.style.opacity = 1;
    anime({ targets: container, opacity: 0, duration: 500, complete: done });
  },
  in: (done) => {
    const container = document.querySelector('#swup');
    container.style.opacity = 0;
    anime({ targets: container, opacity: 1, duration: 500, complete: done });
  }
}
```

## Choosing the animation

As mentioned above, the animation is chosen based on the `from` and `to` properties of the animation object.
Those properties can take several forms:

- a string (matching a route exactly)
- a regular expression
- A route pattern like `/foo/:bar`) parsed by [path-to-regexp](https://github.com/pillarjs/path-to-regexp)
- a custom animation name taken from the `data-swup-animation` attribute of the clicked link

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
  { from: '/', to: 'custom' }
];
```

- from `/` to `/post` → animation **4**
- from `/` to `/posting` → animation **2**
- from `/` to `/post/12` → animation **3**
- from `/` to `/some-route` → animation **1**
- from `/` to `/post` with click having `data-swup-animation="custom"` → animation **5**
