# search-highlight-js

## Overview

`search-highlight-js` is a lightweight library for **highlighting text** in web applications. It offers a powerful yet simple API to search for text or patterns and wrap them with customizable highlight tags. Key features include:

1. Highlighting multiple search terms using a combined regular expression.
2. Dynamically updating highlights based on new search terms.
3. Fully customizable highlight styles, tags, and containers.
4. Deep search mode to continue searching within already highlighted elements.
5. Easy removal of highlights.

## Installation

### 1. Using NPM / Yarn

```bash
npm install search-highlight-js
# or
yarn add search-highlight-js
```

### 2. Using CDN

```html
<script src="https://cdn.jsdelivr.net/npm/search-highlight-js/dist/search-highlight.umd.js"></script>
```

## Quick Start

Here's a basic example of how to highlight all occurrences of the word "hello" on the page:

```javascript
import { Highlighter } from 'search-highlight-js';
// Or, if using a script tag:
// const { Highlighter } = window.searchHighlightJs;

// 1. Create an instance with optional configuration
const highlighter = new Highlighter({
  className: 'highlight-text',
  tagName: 'span',
  caseSensitive: false,
  containerClass: 'highlightable',
  excludeSelector: 'script, style, textarea, input, [contenteditable="true"]',
  instanceAttributeName: 'data-highlighter-instance',
});

// 2. Apply highlights with the desired pattern
highlighter.highlight('hello');
```

Given the following HTML:

```html
<div class="highlightable">
  Hello World! hello
</div>
```

After calling `highlight('hello')`, all occurrences of "hello" (case-insensitive by default) will be wrapped in a `<span>` tag with the default class `highlight-text`.

## Usage

### 1. Constructor

```typescript
constructor(options?: HighlightOptions)
```

- **`options`**: An optional configuration object to customize the behavior of the highlighter.

#### HighlightOptions

```typescript
type HighlightOptions = {
  /**
   * The CSS class name for the highlight element.
   * @default 'highlight-text'
   */
  className?: string;

  /**
   * Whether the search should be case-sensitive.
   * @default false
   */
  caseSensitive?: boolean;

  /**
   * The HTML tag name to use for the highlight element.
   * @default 'span'
   */
  tagName?: string;

  /**
   * The CSS class for container elements to search within.
   * @default 'highlightable'
   */
  containerClass?: string;

  /**
   * CSS selector to exclude certain elements from being searched.
   * @default 'script, style, textarea, input, [contenteditable="true"]'
   */
  excludeSelector?: string;

  /**
   * A specific CSS selector for container elements. Overrides `containerClass` and `excludeSelector` if provided.
   */
  containerSelector?: string;

  /**
   * Custom inline styles to apply to the highlight elements.
   */
  customStyles?: Partial<CSSStyleDeclaration>;

  /**
   * If true, the highlighter will continue searching within already highlighted elements.
   * @default false
   */
  deepSearch?: boolean;

  /**
   * The attribute name to store the highlighter instance ID.
   * @default 'data-highlighter-instance'
   */
  instanceAttributeName?: string;
};
```

### 2. Highlighting Text

#### `highlighter.highlight(pattern)`

Scans the DOM within the specified containers and highlights matching text based on the provided pattern.

- **`pattern`**: The search term(s) or a regular expression.
  - **String**: A single search term.
  - **Array of Strings**: Multiple search terms.
  - **RegExp**: A regular expression for advanced matching. If a `RegExp` is provided, the `caseSensitive` option will be ignored.

**Example: Highlighting a Single Term**

```javascript
const highlighter = new Highlighter();
highlighter.highlight('hello');
```

**Example: Highlighting Multiple Terms**

```javascript
const highlighter = new Highlighter();
highlighter.highlight(['hello', 'world']);
```

**Example: Using a Regular Expression**

```javascript
const highlighter = new Highlighter();
highlighter.highlight(/hello|world/gi);
```

#### Removing Highlights

`highlighter.removeHighlights()` removes all previously added highlights from the DOM.

**Example:**

```javascript
const highlighter = new Highlighter();
highlighter.highlight('hello');

// Later, to remove all highlights:
highlighter.removeHighlights();
```

### 3. Customizing Styles

Customize the appearance of highlighted text by passing a `customStyles` object in the options.

**Example:**

```javascript
const highlighter = new Highlighter({
  customStyles: {
    backgroundColor: 'yellow',
    fontWeight: 'bold',
  },
});
highlighter.highlight('hello');
```

This will inject inline styles like `background-color: yellow; font-weight: bold;` into the highlighted elements.

### 4. Deep Search

When `deepSearch` is enabled, the library uses an advanced algorithm to merge text nodes, search within the combined text, and reapply highlights, even within already highlighted elements.

**Example:**

```javascript
const highlighter = new Highlighter({
  deepSearch: true,
});
highlighter.highlight(['hello', 'world']);
```

## Advanced Example

Suppose you want to highlight case-insensitive occurrences of "Apple" or "Orange" within a specific container `.article-content`, excluding certain elements. Here's how:

**HTML:**

```html
<div class="article-content">
  Apple is a company. apple or orange?
</div>
```

**JavaScript:**

```javascript
const highlighter = new Highlighter({
  containerSelector: '.article-content',
  caseSensitive: false,
  excludeSelector: 'script, style',
  customStyles: {
    backgroundColor: 'pink',
  },
});

highlighter.highlight(['Apple', 'Orange']);
```

The matching text will be highlighted in pink using `<span>` tags within the `.article-content` container.

## Performance Tips

1. **Reduce Scope**  
   Specify `containerClass` or `containerSelector` to limit the area being scanned, improving performance on large documents.

2. **Avoid Unnecessary Deep Search**  
   Enable `deepSearch` only when necessary, as it incurs additional computation.

3. **Batch Processing**  
   For extremely large documents, consider processing the DOM in smaller batches or implementing lazy-loading for parts of the content.

## Common Issues

- **Text Not Highlighted**  
  - Ensure the text exists within elements matching the `containerClass` or `containerSelector`.
  - Verify that the text matches the search term(s) or regular expression.
  - Excluded elements (e.g., `script`, `style`) will not be processed.

- **Styling Conflicts**  
  - Use the `customStyles` option to apply specific styles or override the `.highlight-text` class in your CSS to prevent conflicts with existing styles.

## License

This project is licensed under the **MIT License**.
