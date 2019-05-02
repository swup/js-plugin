# Swup JS plugin (swupjs)

Plugin modifies swup for use with JavaScript animations. Timing and animations are based on JavaScript, not CSS transitions.

Plugin provides the same functionality as [swupjs](https://github.com/gmrchk/swupjs).

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

## Options

Plugin options is an object of animations.
The example below is the default setup and defines two animations,
where out is the animation (function) being executed before content replace, and in is animation being executed after the content is replaced.

One parameter is passed into both functions.
Call of next function serves as an indicator, that animation is done - so in a real world next() would be called as a callback of the animation.
As you can see, by default no animation is being executed and next() is called right away.

```javascript
const options = {
  '*': {
    out: (next) => next(),
    in: (next) => next()
  }
};
```

In the example below, next function is called after two seconds,
which means that swup would wait two seconds (or any time necessary for the load of the new page content),
before continuing to the content replace.

```javascript
...
out: (next) => {
  setTimeout(next, 2000);
}
...
```

Basic usage with tools like GSAP would look something like the following:

```javascript
const options = {
  '*': {
    in: function(next) {
      document.querySelector('#swup').style.opacity = 0;
      TweenLite.to(document.querySelector('#swup'), 0.5, {
        opacity: 1,
        onComplete: next
      });
    },
    out: function(next) {
      document.querySelector('#swup').style.opacity = 1;
      TweenLite.to(document.querySelector('#swup'), 0.5, {
        opacity: 0,
        onComplete: next
      });
    }
  }
};

const swup = new Swup({
  plugins: [new SwupJsPlugin(options)]
});
```

## Choosing the animation

As one may have noticed, the name of animation object in options is defined as `'*'`, which serves as a fallback or base set of animations used throughout the website.
Custom animations can be defined for a transition between any pages, where the name is defined by `[starting route]>[final route]`.

```javascript
...
'homepage>documentation': {
    out: (next) => next(),
    in: (next) => next()
}
...
```

The animation above would be executed for the transition between homepage (**/**) and documentation page (**/documentation**).
Notice that for the lack of route, keyword **homepage** is used.
Any of the two routes can also be defined by wildcard symbol (`homepage>*` or `*>documentation`).
The most fitting animation is always chosen.

## Custom animation to dynamic pages

Similarly to swup default behaviour, where `data-swup-transition` attribute of the clicked link is used for assigning a special class to the html tag,
this plugin uses the same attribute for choosing custom animation.
In case the attribute is defined on clicked link, plugin also tests the animation object for the content of the data attribute.
So following attribute `data-swup-transition="post"` would end up in `*>post` being executed.
