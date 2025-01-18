import { escapeRegExp, binarySearch } from './utils.js';
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

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;

      textMappings.push({
        node,
        index: globalIndex
      });

      globalIndex += node.length;
    }

    let match;

    while ((match = regex.exec(element.textContent)) !== null) {
      const fullMatch = match[0];
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length - 1;
      console.group('highlight');
      console.log('fullMatch', fullMatch, startIndex, endIndex);

      this.wrapRangeDeep(textMappings, startIndex, endIndex);
    }
  }

  /**
   * Given global start/end, find the corresponding Text node range and wrap it with a Range.
   */
  private wrapRangeDeep(textMappings: TextMapping[], startIndex: number, endIndex: number) {
    const startMappingIndex = this.findTextMappingIndex(textMappings, startIndex);
    const endMappingIndex = this.findTextMappingIndex(textMappings, endIndex);

    console.log('textMappings', textMappings);
    console.log('startMappingIndex', startMappingIndex);
    console.log('endMappingIndex', endMappingIndex);
    console.groupEnd();

    if (startMappingIndex === -1 || endMappingIndex === -1) {
      return;
    }

    const startTextMapping = textMappings[startMappingIndex];
    const endTextMapping = textMappings[endMappingIndex];
    const startNode = startTextMapping.node;
    const endNode = endTextMapping.node;
    const startOffsetInNode = startIndex - startTextMapping.index;
    const endOffsetInNode = endIndex - endTextMapping.index;

    if (startMappingIndex !== endMappingIndex) {
      const remainingStartNode = startNode.splitText(startOffsetInNode);
      const wrappedRemainingStartNode = this.wrapNode(document.createTextNode(remainingStartNode.textContent!));
      startNode.parentNode?.replaceChild(wrappedRemainingStartNode, remainingStartNode);

      endNode.splitText(endOffsetInNode + 1);
      const wrappedEndNode = this.wrapNode(document.createTextNode(endNode.textContent!));
      endNode.parentNode?.replaceChild(wrappedEndNode, endNode);

      for (let i = startMappingIndex + 1; i < endMappingIndex; i++) {
        const tm = textMappings[i];
        const wrappedNode = this.wrapNode(document.createTextNode(tm.node.textContent!));
        tm.node.parentNode?.replaceChild(wrappedNode, tm.node);
      }
    } else {
      // Slice from startOffsetInNode to endOffsetInNode
      const startNode = textMappings[startMappingIndex].node;

      const remainingNode = startNode.splitText(startOffsetInNode);
      remainingNode.splitText(endOffsetInNode - startOffsetInNode + 1);

      const wrappedNode = this.wrapNode(document.createTextNode(remainingNode.textContent!));
      remainingNode.parentNode?.replaceChild(wrappedNode, remainingNode);
    }
  }

  private findTextMappingIndex(textMappings: TextMapping[], pos: number): number {
    return binarySearch(textMappings, (tm) => {
      if (pos < tm.index) {
        return -1; // Target is less than the current range
      } else if (pos >= tm.index + tm.node.length) {
        return 1; // Target is greater than the current range
      } else {
        return 0; // Target is within the current range
      }
    });
  }

  private wrapNode(node: Node) {
    const wrapper = document.createElement(this.options.tagName);
    wrapper.className = this.options.className;
    wrapper.setAttribute(this.options.instanceAttributeName, this.instanceId.toString());
    wrapper.appendChild(node);
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
