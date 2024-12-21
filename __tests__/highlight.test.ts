// src/Highlighter.test.ts

import { Highlighter } from '../src/index';

const printStyleSheet = () => {
  const styleElement = document.getElementById('search-highlighter-styles') as HTMLStyleElement;
  const styleSheet = styleElement.sheet as CSSStyleSheet;
  for (const rule of styleSheet.cssRules) {
    console.log(rule.cssText);
  }
};

describe('Highlighter', () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="highlightable">
        This is a test. Testing highlight functionality.
      </div>
      <div class="highlightable">
        Another test case for highlight.
      </div>
    `;
    container = document.querySelector('.highlightable') as HTMLElement;

    // 清空共享的 style 元素
    const styleElement = document.getElementById('search-highlighter-styles') as HTMLStyleElement;
    if (styleElement) {
      styleElement.innerHTML = '';
    }
  });

  // test('highlights single term with unique class', () => {
  //   const highlighter = new Highlighter('test', {
  //     customStyles: { backgroundColor: 'yellow' }
  //   });
  //   highlighter.highlight();

  //   const highlighted = container.querySelector('.highlight-text-0');
  //   expect(highlighted).not.toBeNull();
  //   expect(highlighted?.textContent).toBe('test');
  // });

  test('highlights multiple terms with unique classes', () => {
    const highlighter1 = new Highlighter(['test'], {
      customStyles: { backgroundColor: 'yellow' }
    });
    const highlighter2 = new Highlighter(['test'], {
      customStyles: { backgroundColor: 'lightgreen' }
    });
    highlighter1.highlight();
    highlighter2.highlight();

    const highlighted1 = container.querySelector('.highlight-text-0');
    const highlighted2 = container.querySelector('.highlight-text-1');
    // printStyleSheet();

    expect(highlighted1).not.toBeNull();
    expect(highlighted1?.textContent).toBe('test');
    expect(highlighted2).not.toBeNull();
    expect(highlighted2?.textContent).toBe('test');

    console.log(document.body.innerHTML);
  });

  // test('removes highlights correctly', () => {
  //   const highlighter = new Highlighter('test', {
  //     customStyles: { backgroundColor: 'yellow' }
  //   });
  //   highlighter.highlight();
  //   highlighter.removeHighlights();

  //   const highlighted = container.querySelector('.highlight-text-0');
  //   expect(highlighted).toBeNull();
  //   expect(container.innerHTML).toContain('test');
  // });

  // test('updates search terms correctly', () => {
  //   const highlighter = new Highlighter('test', {
  //     customStyles: { backgroundColor: 'yellow' }
  //   });
  //   highlighter.highlight();
  //   highlighter.updateSearchTerms('highlight');

  //   const oldHighlight = container.querySelector('.highlight-text-0');
  //   expect(oldHighlight).toBeNull();

  //   const newHighlight = container.querySelector('.highlight-text-1');
  //   expect(newHighlight).not.toBeNull();
  //   expect(newHighlight?.textContent).toBe('highlight');
  // });

  // test('supports case insensitive search by default', () => {
  //   const highlighter = new Highlighter('Test');
  //   highlighter.highlight();

  //   const highlighted = container.querySelector('.highlight-text-0');
  //   expect(highlighted).not.toBeNull();
  //   expect(highlighted?.textContent).toBe('test');
  // });

  // test('supports case sensitive search', () => {
  //   const highlighter = new Highlighter('Test', { caseSensitive: true });
  //   highlighter.highlight();

  //   const highlighted = container.querySelector('.highlight-text-0');
  //   expect(highlighted).toBeNull();
  //   expect(container.innerHTML).not.toContain('<span class="highlight-text-0">Test</span>');
  // });

  // test('applies custom tag name', () => {
  //   const highlighter = new Highlighter('test', {
  //     tagName: 'mark',
  //     customStyles: { backgroundColor: 'yellow' }
  //   });
  //   highlighter.highlight();

  //   const highlighted = container.querySelector('mark.highlight-text-0');
  //   expect(highlighted).not.toBeNull();
  //   expect(highlighted?.textContent).toBe('test');
  // });

  // test('excludes specified selectors', () => {
  //   document.body.innerHTML += `
  //     <div class="highlightable">
  //       <script>const test = "should not highlight";</script>
  //       <span>test inside span</span>
  //     </div>
  //   `;
  //   const highlighter = new Highlighter('test', {
  //     excludeSelector: 'script'
  //   });
  //   highlighter.highlight();

  //   const scriptHighlight = document.querySelector('script .highlight-text-0');
  //   expect(scriptHighlight).toBeNull();

  //   const spanHighlight = document.querySelector('span.highlight-text-0');
  //   expect(spanHighlight).not.toBeNull();
  //   expect(spanHighlight?.textContent).toBe('test');
  // });

  // test('shared style element contains all custom styles', () => {
  //   const highlighter1 = new Highlighter('test1', {
  //     customStyles: { backgroundColor: 'yellow' }
  //   });
  //   const highlighter2 = new Highlighter('test2', {
  //     customStyles: { backgroundColor: 'lightgreen' }
  //   });
  //   highlighter1.highlight();
  //   highlighter2.highlight();

  //   const styleElement = document.getElementById('dom-text-highlighter-styles') as HTMLStyleElement;
  //   expect(styleElement).not.toBeNull();
  //   expect(styleElement.innerHTML).toContain('.highlight-text-0');
  //   expect(styleElement.innerHTML).toContain('.highlight-text-1');
  // });
});
