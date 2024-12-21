import { escapeRegExp } from './utils.js';

type HighlightOptions = {
  className?: string;
  caseSensitive?: boolean;
  customStyles?: Partial<CSSStyleDeclaration>;
  containerSelector?: string;
  tagName?: string; // 新增：允许自定义标签
  excludeSelector?: string; // 新增：允许排除某些子元素
  onHighlight?: (element: Node, searchTerm: string) => void;
};

type InnerHighlightOptions = {
  className: string;
  caseSensitive: boolean;
  customStyles?: Partial<CSSStyleDeclaration>;
  containerSelector: string;
  tagName: string;
  excludeSelector: string;
  onHighlight?: (element: Node, searchTerm: string) => void;
};

export class Highlighter {
  private static highlighterIdCounter: number = 0;
  private static sharedStyleElement: HTMLStyleElement | null = null;

  private options: InnerHighlightOptions;
  private searchTerms: string[];
  // private mutationObserver?: MutationObserver;

  constructor(searchTerms: string | string[], options: HighlightOptions = {}) {
    this.searchTerms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
    const { className, ...restOptions } = options;
    this.options = {
      className: `${className || 'highlight-text'}-${Highlighter.highlighterIdCounter++}`,
      caseSensitive: false,
      containerSelector: '.highlightable',
      tagName: 'span',
      excludeSelector: 'script, style, textarea, input, [contenteditable="true"]',
      ...restOptions
    };
    this.applyCustomStyles();
  }

  private static initializeSharedStyleElement() {
    if (!Highlighter.sharedStyleElement) {
      Highlighter.sharedStyleElement = document.createElement('style');
      Highlighter.sharedStyleElement.setAttribute('id', 'search-highlighter-styles');
      document.head.appendChild(Highlighter.sharedStyleElement);
    }
  }

  private applyCustomStyles() {
    if (!this.options.customStyles) return;

    Highlighter.initializeSharedStyleElement();
    const styleSheet = Highlighter.sharedStyleElement!.sheet as CSSStyleSheet;

    let styleRule = `.${this.options.className} {`;
    for (const [key, value] of Object.entries(this.options.customStyles)) {
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      styleRule += `${kebabKey}: ${value};`;
    }
    styleRule += `}`;

    styleSheet.insertRule(styleRule, styleSheet.cssRules.length);
  }

  private getSearchRegexes(): RegExp[] {
    return this.searchTerms.map((term) => {
      const escapedTerm = escapeRegExp(term);
      return new RegExp(`(${escapedTerm})`, this.options.caseSensitive ? 'g' : 'gi');
    });
  }

  public highlight(): void {
    console.log(this.options);
    const containers = document.querySelectorAll(this.options.containerSelector);
    const regexes = this.getSearchRegexes();

    containers.forEach((element) => {
      this.highlightElement(element as HTMLElement, regexes);
    });

    // // 设置 MutationObserver 以处理动态内容
    // this.observeMutations();
  }

  private highlightElement(element: HTMLElement, regexes: RegExp[]): void {
    regexes.forEach((regex, index) => {
      this.searchAndHighlight(element, regex, this.searchTerms[index]);
    });
  }

  private searchAndHighlight(element: HTMLElement, regex: RegExp, searchTerm: string): void {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, (node) => {
      return NodeFilter.FILTER_ACCEPT;
    });

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (!node.textContent) continue;

      const matches = node.textContent.match(regex);
      if (matches) {
        textNodes.push(node);
      }
    }

    textNodes.forEach((node) => {
      const parent = node.parentNode as HTMLElement;
      const text = node.textContent || '';
      const newHTML = text.replace(
        regex,
        `<${this.options.tagName} class="${this.options.className}">$1</${this.options.tagName}>`
      );

      const range = document.createRange();
      range.selectNodeContents(node);
      const fragment = range.createContextualFragment(newHTML);
      parent.replaceChild(fragment, node);

      // if (this.options.onHighlight) {
      //   // 如果想传递高亮后的元素，可以在这里查找新添加的元素
      //   const highlightElement = parent.querySelector(`.${this.options.className}`) as HTMLElement;
      //   if (highlightElement) {
      //     this.options.onHighlight(highlightElement, searchTerm);
      //   }
      // }
    });
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

  public updateSearchTerms(newSearchTerms: string | string[]): void {
    this.removeHighlights();
    this.searchTerms = Array.isArray(newSearchTerms) ? newSearchTerms : [newSearchTerms];
    this.highlight();
  }

  // private observeMutations() {
  //   if (this.mutationObserver) return;

  //   this.mutationObserver = new MutationObserver((mutations) => {
  //     mutations.forEach((mutation) => {
  //       if (mutation.type === 'childList' || mutation.type === 'characterData') {
  //         this.highlight(); // 重新高亮
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
