import { escapeRegExp } from './utils.js';
import type { SetRequired } from 'type-fest';

/* NOTE:
 * 1. If containerSelector is provided, it will override containerClass + excludeSelector
 * 2. If search is a RegExp, the caseSensitive option will be ignored
 */

type HighlightOptions = {
  caseSensitive?: boolean;
  /**
   * Selector for the container element.
   */
  containerClass?: string;
  excludeSelector?: string;
  containerSelector?: string;
  /**
   * The configuration for the highlight element.
   */
  tagName?: string;
  className?: string;
  customStyles?: Partial<CSSStyleDeclaration>;
  // onHighlight?: (element: Node, searchTerm: string) => void;
  /**
   * If deepSearch = true, the highlight will also search through the highlighted elements.
   */
  deepSearch?: boolean;
  /**
   * The attribute name to store the highlighter instance id.
   * @default 'data-highlighter-instance'
   */
  instanceAttributeName?: string;
};

type InnerHighlightOptions = SetRequired<
  HighlightOptions,
  'className' | 'caseSensitive' | 'tagName' | 'excludeSelector' | 'containerClass' | 'instanceAttributeName'
>;

type TextMapping = {
  node: Text;
  index: number;
  isHighlighted: boolean;
};

export class Highlighter {
  private static highlighterIdCounter: number = 0;
  private static sharedStyleElement: HTMLStyleElement | null = null;
  private static ensureSharedStyleElementInitialized() {
    if (!Highlighter.sharedStyleElement) {
      Highlighter.sharedStyleElement = document.createElement('style');
      Highlighter.sharedStyleElement.setAttribute('id', 'search-highlighter-styles');
      document.head.appendChild(Highlighter.sharedStyleElement);
    }
  }

  private options: InnerHighlightOptions = {
    className: 'highlight-text',
    caseSensitive: false,
    tagName: 'span',
    containerClass: 'highlightable',
    excludeSelector: 'script, style, textarea, input, [contenteditable="true"]',
    instanceAttributeName: 'data-highlighter-instance'
  };
  private instanceId: number;
  // private mutationObserver?: MutationObserver;

  constructor(options: HighlightOptions = {}) {
    this.instanceId = Highlighter.highlighterIdCounter++;
    Object.assign(this.options, options);
    this.applyCustomStyles();
  }

  public highlight(pattern: string | string[] | RegExp): void {
    const mergedRegex = this.buildMergedRegex(pattern);
    if (!mergedRegex) return;

    const containers = document.querySelectorAll(
      this.options.containerSelector ?? `.${this.options.containerClass}:not(${this.options.excludeSelector})`
    );

    containers.forEach((element) => {
      if (this.options.deepSearch) {
        this.searchAndHighlightDeep(element as HTMLElement, mergedRegex);
      } else {
        this.searchAndHighlight(element as HTMLElement, mergedRegex);
      }
    });
  }

  public removeHighlights(): void {
    const highlightElements = document.querySelectorAll(
      `.${this.options.className}[${this.options.instanceAttributeName}="${this.instanceId}"]`
    );
    highlightElements.forEach((highlightElement) => {
      const parent = highlightElement.parentNode as HTMLElement;
      if (!parent) return;

      const fragment = document.createDocumentFragment();
      while (highlightElement.firstChild) {
        fragment.appendChild(highlightElement.firstChild);
      }

      parent.replaceChild(fragment, highlightElement);
      parent.normalize();
    });
  }

  private applyCustomStyles() {
    if (!this.options.customStyles) return;

    Highlighter.ensureSharedStyleElementInitialized();
    const styleSheet = Highlighter.sharedStyleElement!.sheet as CSSStyleSheet;

    let styleRule = `.${this.options.className}[${this.options.instanceAttributeName}="${this.instanceId}"] {`;
    for (const [key, value] of Object.entries(this.options.customStyles)) {
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      styleRule += `${kebabKey}: ${value};`;
    }
    styleRule += `}`;

    styleSheet.insertRule(styleRule, styleSheet.cssRules.length);
  }

  private buildMergedRegex(pattern: string | string[] | RegExp) {
    if (pattern instanceof RegExp) {
      return pattern;
    }

    const terms = Array.isArray(pattern) ? pattern : [pattern];
    if (!terms.length) {
      return null;
    }

    const alternation = terms.map(escapeRegExp).join('|');
    const flags = this.options.caseSensitive ? 'g' : 'gi';
    return new RegExp(`(${alternation})`, flags);
  }

  private searchAndHighlight(element: HTMLElement, regex: RegExp): void {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, (node) => {
      if (!node.nodeValue || !node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    });

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const matches = node.nodeValue!.match(regex);
      if (matches) {
        textNodes.push(node);
      }
    }

    textNodes.forEach((node) => {
      const parent = node.parentNode as HTMLElement;
      const text = node.textContent || '';
      const newHTML = text.replace(
        regex,
        `<${this.options.tagName} 
          class="${this.options.className}" 
          ${this.options.instanceAttributeName}="${this.instanceId}">$1</${this.options.tagName}>`
      );

      const range = document.createRange();
      range.selectNodeContents(node);
      const fragment = range.createContextualFragment(newHTML);
      parent.replaceChild(fragment, node);
    });
  }

  /**
   * When deepSearch = true, enable the new "merge text + Range" highlighting method.
   * Core idea:
   * 1. Collect all visible text within the element and record their distribution (offset) in the DOM.
   * 2. Perform regex search on the merged string to get all match start/end positions.
   * 3. Convert each match into a DOM Range and insert a new highlight tag by wrapping.
   */
  private searchAndHighlightDeep(element: HTMLElement, regex: RegExp): void {
    if (!element.textContent) return;

    const textMappings: TextMapping[] = [];
    let globalIndex = 0;

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    // const iterator = document.createNodeIterator(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    // console.dir(iterator.nextNode());

    console.dir(walker.currentNode);

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      // console.dir(node);
      // const nodeText = node.nodeValue!;
      // const start = globalIndex;
      // const end = start + nodeText.length;
      // const isHighlighted = (node.parentNode as HTMLElement)?.classList.contains(this.options.className);

      textMappings.push({
        node,
        index: globalIndex,
        isHighlighted: node.parentElement?.classList.contains(this.options.className) ?? false
      });

      globalIndex += node.length;
    }

    console.log(textMappings);

    let match;

    while ((match = regex.exec(element.textContent)) !== null) {
      const fullMatch = match[0];
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length - 1;
      console.log(startIndex, endIndex);

      this.wrapRangeDeep(textMappings, startIndex, endIndex);
    }
  }

  /**
   * Given global start/end, find the corresponding Text node range and wrap it with a Range.
   */
  private wrapRangeDeep(textMappings: TextMapping[], startIndex: number, endIndex: number) {
    let startMapping = -1;
    let endMapping = -1;
    let startOffsetInNode = 0;
    let endOffsetInNode = 0;

    for (let i = 0; i < textMappings.length; i++) {
      const tm = textMappings[i];

      // startIndex is in [tm.index, tm.index + tm.node.length)
      if (startIndex >= tm.index && startIndex < tm.index + tm.node.length) {
        startMapping = i;
        startOffsetInNode = startIndex - tm.index;
      }
      // endIndex is in [tm.index, tm.index + tm.node.length)
      if (endIndex >= tm.index && endIndex < tm.index + tm.node.length) {
        endMapping = i;
        endOffsetInNode = endIndex - tm.index;
        break;
      }
    }

    if (startMapping === -1 || endMapping === -1) {
      return;
    }

    console.log(startMapping, endMapping, startOffsetInNode, endOffsetInNode);

    // for (let i = startMapping; i <= endMapping; i++) {
    //   const tm = textMappings[i];

    // }

    const startNode = textMappings[startMapping].node;
    const endNode = textMappings[endMapping].node;

    const remainingStartNode = startNode.splitText(startOffsetInNode);
    startNode.parentNode?.replaceChild(this.wrapText(remainingStartNode.textContent!), remainingStartNode);

    endNode.splitText(endOffsetInNode + 1);
    endNode.parentNode?.replaceChild(this.wrapText(endNode.textContent!), endNode);

    for (let i = startMapping + 1; i < endMapping; i++) {
      const tm = textMappings[i];
      tm.node.parentNode?.replaceChild(this.wrapText(tm.node.textContent!), tm.node);
    }

    // const range = document.createRange();
    // range.setStart(startNode, startOffsetInNode);
    // range.setEnd(endNode, endOffsetInNode);
    // const extractedContents = range.extractContents();
    // // console.dir(extractedContents.children);
    // for (const child of extractedContents.childNodes) {
    //   console.log(child);
    // }

    // const wrapper = document.createElement(this.options.tagName);
    // wrapper.className = this.options.className;
    // wrapper.setAttribute(this.options.instanceAttributeName, this.instanceId.toString());
    // wrapper.appendChild(extractedContents);

    // range.insertNode(wrapper);
  }

  private wrapNode(node: Node) {
    const wrapper = document.createElement(this.options.tagName);
    wrapper.className = this.options.className;
    wrapper.setAttribute(this.options.instanceAttributeName, this.instanceId.toString());
    wrapper.appendChild(node);
    return wrapper;
  }

  private wrapText(text: string) {
    const wrapper = document.createElement(this.options.tagName);
    wrapper.className = this.options.className;
    wrapper.setAttribute(this.options.instanceAttributeName, this.instanceId.toString());
    wrapper.appendChild(document.createTextNode(text));
    return wrapper;
  }

  // private observeMutations() {
  //   if (this.mutationObserver) return;

  //   this.mutationObserver = new MutationObserver((mutations) => {
  //     mutations.forEach((mutation) => {
  //       if (mutation.type === 'childList' || mutation.type === 'characterData') {
  //         this.highlight();
  //       }
  //     });
  //   });

  //   const containers = document.querySelectorAll(this.options.containerSelector);
  //   containers.forEach((element) => {
  //     this.mutationObserver?.observe(element, {
  //       childList: true,
  //       subtree: true,
  //       characterData: true
  //     });
  //   });
  // }

  // public disconnectObserver() {
  //   if (this.mutationObserver) {
  //     this.mutationObserver.disconnect();
  //     this.mutationObserver = undefined;
  //   }
  // }
}
