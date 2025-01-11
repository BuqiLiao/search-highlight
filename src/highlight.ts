import { escapeRegExp } from './utils.js';
import type { SetRequired, SetOptional } from 'type-fest';

// NOTE: If containerSelector is provided, it will override containerClass + excludeSelector

type HighlightOptions = {
  className?: string;
  caseSensitive?: boolean;
  tagName?: string;
  containerClass?: string;
  excludeSelector?: string;
  containerSelector?: string;
  customStyles?: Partial<CSSStyleDeclaration>;
  onHighlight?: (element: Node, searchTerm: string) => void;

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
  private searchTerms: string[];
  private instanceId: number;
  // private mutationObserver?: MutationObserver;

  constructor(searchTerms: string | string[], options: HighlightOptions = {}) {
    this.instanceId = Highlighter.highlighterIdCounter++;
    this.searchTerms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
    Object.assign(this.options, options);
    this.applyCustomStyles();
  }

  public highlight(): void {
    console.log(this.options);
    const containers = document.querySelectorAll(
      this.options.containerSelector ?? `.${this.options.containerClass}:not(${this.options.excludeSelector})`
    );
    const regexes = this.getSearchRegexes();

    containers.forEach((element) => {
      this.highlightElement(element as HTMLElement, regexes);
    });

    // // 设置 MutationObserver 以处理动态内容
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

  public updateSearchTerms(newSearchTerms: string | string[]): void {
    this.removeHighlights();
    this.searchTerms = Array.isArray(newSearchTerms) ? newSearchTerms : [newSearchTerms];
    this.highlight();
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

  private getSearchRegexes(): RegExp[] {
    return this.searchTerms.map((term) => {
      const escapedTerm = escapeRegExp(term);
      return new RegExp(`(${escapedTerm})`, this.options.caseSensitive ? 'g' : 'gi');
    });
  }

  private highlightElement(element: HTMLElement, regexes: RegExp[]): void {
    regexes.forEach((regex, index) => {
      if (this.options.deepSearch) {
        this.searchAndHighlightDeep(element, regex);
      } else {
        this.searchAndHighlight(element, regex);
      }
    });
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
   * 当 deepSearch = true 时，启用新的"合并文本 + Range"方式高亮。
   * 核心思路：
   * 1. 收集 element 内所有可见文本，并记录它们在 DOM 中的分布(offset)。
   * 2. 对合并后的字符串做 regex 搜索，得到所有 match 的 start/end。
   * 3. 每个 match 转换为一个 DOM Range，通过包裹的方式插入新的高亮标签。
   */
  private searchAndHighlightDeep(element: HTMLElement, regex: RegExp): void {
    // 1. 先收集所有的 text node 及其文本，构建一个"文本映射表"
    interface TextMapping {
      node: Text;
      globalStart: number; // 在合并文本中的全局 start
      globalEnd: number; // 在合并文本中的全局 end
      isHighlighted: boolean;
    }

    const textMappings: TextMapping[] = [];
    let globalIndex = 0;

    // 这里不再排除 span.highlight 之类的节点，因为我们要"深度"搜索
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let combinedText = ''; // 把整个 element 里的文本合并

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const nodeText = node.nodeValue!;
      const start = globalIndex;
      const end = start + nodeText.length;
      const isHighlighted = (node.parentNode as HTMLElement)?.classList.contains('highlight-text-2');

      // 加入 textMappings
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
    // 每次匹配都需要从头来过，否则会漏掉多个 match
    while ((match = regex.exec(combinedText)) !== null) {
      const fullMatch = match[0];
      // 在 combinedText 里的起始与结束
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length;

      // 3. 我们将 startIndex/endIndex 转换成 DOM Range，并包裹
      this.wrapRangeDeep(textMappings, startIndex, endIndex);

      // // 触发回调
      // if (this.options.onHighlight) {
      //   this.options.onHighlight(element, this.searchTerms[regexIndex]);
      // }
    }
  }

  /**
   * 给定全局的 start/end，找到对应的 Text 节点区间并用 Range 包裹。
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
    // 1. 找到 range 起始对应的 textMappings 项
    let startMapping = -1; // textMappings 的索引
    let endMapping = -1;
    let startOffsetInNode = 0;
    let endOffsetInNode = 0;

    for (let i = 0; i < textMappings.length; i++) {
      const tm = textMappings[i];

      // 如果 startIndex 落在 [tm.globalStart, tm.globalEnd) 里
      if (startIndex >= tm.globalStart && startIndex < tm.globalEnd) {
        if (tm.isHighlighted && startIndex !== tm.globalStart) {
          // 如果当前节点已经高亮，且 startIndex 不是在节点开头，则不处理
          return;
        }

        startMapping = i;
        startOffsetInNode = startIndex - tm.globalStart;
      }
      // 如果 endIndex 落在 [tm.globalStart, tm.globalEnd] 里
      if (endIndex > tm.globalStart && endIndex <= tm.globalEnd) {
        if (tm.isHighlighted && endIndex !== tm.globalEnd) {
          // 如果当前节点已经高亮，且 endIndex 不是在节点末尾，则不处理
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

    // 2. 构建 Range
    const range = document.createRange();
    range.setStart(startNode, startOffsetInNode);
    range.setEnd(endNode, endOffsetInNode);
    const extractedContents = range.extractContents();

    // 3. 包裹
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
