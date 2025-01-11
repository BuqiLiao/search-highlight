import { escapeRegExp } from './utils.js';
import type { SetRequired } from 'type-fest';

/* NOTE:
 * 1. If containerSelector is provided, it will override containerClass + excludeSelector
 * 2. If search is a RegExp, the caseSensitive option will be ignored
 */

type HighlightOptions = {
  className?: string;
  caseSensitive?: boolean;
  tagName?: string;
  containerClass?: string;
  excludeSelector?: string;
  containerSelector?: string;
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

export class Highlighter {
  private static highlighterIdCounter: number = 0;
  private static sharedStyleElement: HTMLStyleElement | null = null;
  private static initializeSharedStyleElement() {
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
  private mergedRegex: RegExp | null = null;
  private instanceId: number;
  // private mutationObserver?: MutationObserver;

  constructor(search: string | string[] | RegExp, options: HighlightOptions = {}) {
    this.instanceId = Highlighter.highlighterIdCounter++;
    this.buildMergedRegex(search);
    Object.assign(this.options, options);
    this.applyCustomStyles();
  }

  public highlight(): void {
    if (!this.mergedRegex) return;

    const containers = document.querySelectorAll(
      this.options.containerSelector ?? `.${this.options.containerClass}:not(${this.options.excludeSelector})`
    );

    containers.forEach((element) => {
      if (this.options.deepSearch) {
        this.searchAndHighlightDeep(element as HTMLElement, this.mergedRegex!);
      } else {
        this.searchAndHighlight(element as HTMLElement, this.mergedRegex!);
      }
    });

    // this.observeMutations();
  }

  public removeHighlights(): void {
    const highlightElements = document.querySelectorAll(`.${this.options.className}`);
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

  public updateSearch(newSearch: string | string[] | RegExp): void {
    this.removeHighlights();
    this.buildMergedRegex(newSearch);
    this.highlight();
  }

  private buildMergedRegex(search: string | string[] | RegExp) {
    if (search instanceof RegExp) {
      this.mergedRegex = search;
      return;
    }

    const terms = Array.isArray(search) ? search : [search];
    if (!terms.length) {
      this.mergedRegex = null;
      return;
    }

    const alternation = terms.map(escapeRegExp).join('|');
    const flags = this.options.caseSensitive ? 'g' : 'gi';
    this.mergedRegex = new RegExp(`(${alternation})`, flags);
  }

  private applyCustomStyles() {
    if (!this.options.customStyles) return;

    Highlighter.initializeSharedStyleElement();
    const styleSheet = Highlighter.sharedStyleElement!.sheet as CSSStyleSheet;

    let styleRule = `.${this.options.className}[${this.options.instanceAttributeName}="${this.instanceId}"] {`;
    for (const [key, value] of Object.entries(this.options.customStyles)) {
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      styleRule += `${kebabKey}: ${value};`;
    }
    styleRule += `}`;

    styleSheet.insertRule(styleRule, styleSheet.cssRules.length);
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
    interface TextMapping {
      node: Text;
      globalStart: number;
      globalEnd: number;
      isHighlighted: boolean;
    }

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

    let combinedText = '';

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const nodeText = node.nodeValue!;
      const start = globalIndex;
      const end = start + nodeText.length;
      const isHighlighted = (node.parentNode as HTMLElement)?.classList.contains('highlight-text-2');

      textMappings.push({
        node,
        globalStart: start,
        globalEnd: end,
        isHighlighted
      });

      combinedText += nodeText;
      globalIndex = end;
    }

    let match;

    while ((match = regex.exec(combinedText)) !== null) {
      const fullMatch = match[0];
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length;

      this.wrapRangeDeep(textMappings, startIndex, endIndex);
    }
  }

  /**
   * Given global start/end, find the corresponding Text node range and wrap it with a Range.
   */
  private wrapRangeDeep(
    textMappings: {
      node: Text;
      globalStart: number;
      globalEnd: number;
      isHighlighted: boolean;
    }[],
    startIndex: number,
    endIndex: number
  ) {
    let startMapping = -1;
    let endMapping = -1;
    let startOffsetInNode = 0;
    let endOffsetInNode = 0;

    for (let i = 0; i < textMappings.length; i++) {
      const tm = textMappings[i];

      // startIndex is in [tm.globalStart, tm.globalEnd)
      if (startIndex >= tm.globalStart && startIndex < tm.globalEnd) {
        if (tm.isHighlighted && startIndex !== tm.globalStart) {
          // If the current node is already highlighted and startIndex is not at the node's start, do nothing
          return;
        }

        startMapping = i;
        startOffsetInNode = startIndex - tm.globalStart;
      }
      // endIndex is in [tm.globalStart, tm.globalEnd]
      if (endIndex > tm.globalStart && endIndex <= tm.globalEnd) {
        if (tm.isHighlighted && endIndex !== tm.globalEnd) {
          // If the current node is already highlighted and endIndex is not at the node's end, do nothing
          return;
        }

        endMapping = i;
        endOffsetInNode = endIndex - tm.globalStart;
        break;
      }
    }

    if (startMapping === -1 || endMapping === -1) {
      return;
    }

    const startNode = textMappings[startMapping].node;
    const endNode = textMappings[endMapping].node;

    const range = document.createRange();
    range.setStart(startNode, startOffsetInNode);
    range.setEnd(endNode, endOffsetInNode);
    const extractedContents = range.extractContents();

    const wrapper = document.createElement(this.options.tagName);
    wrapper.className = this.options.className;
    wrapper.setAttribute(this.options.instanceAttributeName, this.instanceId.toString());
    wrapper.appendChild(extractedContents);

    range.insertNode(wrapper);
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
