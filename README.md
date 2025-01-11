Here is the English version of the README for **search-highlight-js**. It introduces the package's features, installation, usage, and advanced options for text highlighting in web applications.

---

# search-highlight-js

## Overview

`search-highlight-js` is a lightweight library for **highlighting text** in web applications. It provides a powerful yet simple API to search for text or patterns and wrap them with customizable highlight tags. Key features include:

1. Highlighting multiple search terms using a combined regular expression.
2. Updating highlights dynamically based on new search terms.
3. Fully customizable highlight styles, tags, and containers.
4. Deep search mode to continue searching inside already highlighted elements.
5. Removing highlights with ease.

## Installation

1. **Using NPM / Yarn**

   ```bash
   npm install search-highlight-js
   # or
   yarn add search-highlight-js
   ```

2. **Using CDN**

   ```html
   <script src="https://cdn.jsdelivr.net/npm/search-highlight-js/dist/search-highlight.umd.js"></script>
   ```

## Quick Start

Here is a basic example of how to highlight all occurrences of the word "hello" on the page:

```js
import { Highlighter } from 'search-highlight-js';
// Or: const { Highlighter } = window.searchHighlightJs; // If using a script tag

// 1. Create an instance
const highlighter = new Highlighter('hello');

// 2. Apply highlights
highlighter.highlight();
```

Given the following HTML:

```html
<div class="highlightable">
  Hello World! hello
</div>
```

After calling `highlight()`, all occurrences of "hello" will be wrapped in a `<span>` tag with the default class `highlight-text`.

## Usage

### 1. Constructor

```ts
constructor(search: string | string[] | RegExp, options?: HighlightOptions)
```

- **`search`**: The search term(s) or a regular expression.
  - If it's a regular expression, it will be used directly (case sensitivity options will be ignored).
  - If it's a string or an array of strings, they will be combined into a single regular expression.
- **`options`**: An optional configuration object for customizing the behavior.

#### HighlightOptions

```ts
type HighlightOptions = {
  className?: string;          // Default: 'highlight-text'
  caseSensitive?: boolean;     // Default: false
  tagName?: string;            // Default: 'span'
  containerClass?: string;     // Default: 'highlightable'
  excludeSelector?: string;    // Default: 'script, style, textarea, input, [contenteditable="true"]'
  containerSelector?: string;  // Overrides containerClass + excludeSelector
  customStyles?: Partial<CSSStyleDeclaration>;
  onHighlight?: (element: Node, searchTerm: string) => void;
  deepSearch?: boolean;        // Enables highlighting inside already highlighted elements
  instanceAttributeName?: string; // Default: 'data-highlighter-instance'
};
```

### 2. Highlighting Text

#### `highlighter.highlight()`

Scans the DOM and highlights matching text:

```js
const highlighter = new Highlighter('hello', { caseSensitive: true });
highlighter.highlight();
```

When `deepSearch` is set to `true`, it continues searching within already highlighted text. Example:

```js
const highlighter = new Highlighter(['hello', 'world'], {
  deepSearch: true,
});
highlighter.highlight();
```

#### Removing Highlights

`highlighter.removeHighlights()` removes all previously added highlights:

```js
const highlighter = new Highlighter('hello');
highlighter.highlight();

// Remove all highlights
highlighter.removeHighlights();
```

#### Updating Search Terms

You can update the search term and reapply highlights using `updateSearch(newSearch)`:

```js
const highlighter = new Highlighter('hello');
highlighter.highlight();

// Update the search term
highlighter.updateSearch('new keyword');
```

### 3. Customizing Styles

You can customize the styles of the highlighted text by passing a `customStyles` object:

```js
const highlighter = new Highlighter('hello', {
  customStyles: {
    backgroundColor: 'yellow',
    fontWeight: 'bold',
  },
});
highlighter.highlight();
```

This will inject inline styles like `background-color: yellow; font-weight: bold;` into the highlighted elements.

### 4. Deep Search

When `deepSearch` is enabled, the library uses a more advanced algorithm to merge text nodes, search within the combined text, and reapply highlights, even within already highlighted elements.

```js
const highlighter = new Highlighter('term', { deepSearch: true });
highlighter.highlight();
```

## Advanced Example

Suppose you want to highlight case-insensitive occurrences of "Apple" or "Orange" in a specific container `.article-content`, excluding certain elements. Here's how:

```html
<div class="article-content">
  Apple is a company. apple or orange?
</div>
```

```js
const highlighter = new Highlighter(['Apple', 'Orange'], {
  containerSelector: '.article-content',
  caseSensitive: false,
  excludeSelector: 'script, style',
  customStyles: {
    backgroundColor: 'pink',
  },
});

highlighter.highlight();
```

The matching text will be highlighted in pink using `<span>` tags.

## Performance Tips

1. **Reduce Scope**  
   Specify `containerClass` or `containerSelector` to limit the area being scanned.

2. **Avoid Unnecessary Deep Search**  
   Only enable `deepSearch` when necessary, as it incurs additional computation.

3. **Batch Processing**  
   For large documents, consider processing the DOM in smaller batches or lazy-loading parts of the content.

## Common Issues

- **Text Not Highlighted**  
  - Ensure the text exists in the `containerClass` or `containerSelector`.
  - Verify that the text matches the search term or regular expression.
  - Excluded elements (e.g., `script`, `style`) will not be processed.

- **Styling Conflicts**  
  - Use custom styles or override the `.highlight-text` class in your CSS.


## License

This project is licensed under the **MIT License**.

---

Enjoy using **search-highlight-js** for your text-highlighting needs!